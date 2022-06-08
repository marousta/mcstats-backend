const pg			= require('./sql.js');
const utils			= require('./utils/utils.js');
const logs			= require('./utils/logs.js');
const time			= require('./utils/time.js');
const colors		= require('./utils/colors.js');
const response		= require('./utils/response.js');
const websocket		= require('./websocket.js');
const mc			= require('minecraft-server-util');

/////////////////////////////

async function fetchBedrockVersion()
{
	let query = await mc.queryFull(process.env.minecraftBedrockHost, parseInt(process.env.minecraftBedrockPort), { timeout: 3000 })
						.then(result => {
							return { status: true, ...result};
						})
						.catch(error => {
							logs.mc("fetchBedrockVersion: " + error.message);
							return { status: false };
						});
	if (query.status === true) {
		const version = query.version.split(" ")[2];
		mcBedrockVersion = version;
	}
}

async function fetchData()
{
	let query = await mc.queryFull(process.env.minecraftHost, parseInt(process.env.minecraftQueryPort), { timeout: 3000 })
						.then(result => {
							return { status: true, ...result};
						})
						.catch(error => {
							logs.mc(error.message);
							return { status: false };
						});

	if (query.status === false) {
		return { status: false };
	}

	return {
		status: true,
		version: query.version,
		software: query.software,
		players_online: query.players.online,
		max_players: query.players.max,
		player_names: query.players.list,
	};
}

///////////////////////////// init

let playersConnected = null;
let playersOnline = 0;
let maxPlayersOnline = 0;
let serverOnline = false;
let serverRetry = 0;
let mcVersion = null;
let mcBedrockVersion = null;
fetchBedrockVersion();

async function updateServerStatus(status)
{
	// get previous server status
	let ret = response.sql(await pg.getServerStatus(1, "DESC"), "Unable to get server status");
	if (ret === "error") {
		return { state: "error" };
	} else if (ret === "partial") { // no database entry create one based on current server status
		ret = response.sql(await pg.createServerStatus(status), "Unable to create default server status");
		if (ret === "error") {
			return { state: "error" };
		}
		return { state: "success" };
	}

	// server database already up to date, nothing to do
	if (ret[0].value === status) {
		return { state: "success" };
	}

	// server status differ from database, updating ..
	ret = response.sql(await pg.createServerStatus(status), "Unable to create server status");
	if (ret === "error") {
		return { state: "error" };
	}
	return { state: "success" };
}

async function initPlayerConnected()
{
	const ret = response.sql(await pg.getPlayersSessions(), "Unable to init playersConnected");
	if (ret === "error") {
		process.exit();
	}
	playersConnected = utils.extractJSON(ret, "username");
}

///////////////////////////// dataCollect

async function generateReturn(data)
{
	// probably overkill here
	let player_names = data.player_names;
	if (player_names === undefined) {
		player_names = [];
	}

	const since = response.sql(await pg.getServerStatus(1), "Unable to get server status");
	if (since === "error") {
		return { state: "error" };
	}

	return {
		state: "success",
		timestamp: time.getTimestamp(),
		serverStatus: {
			online: serverOnline,
			since: since[0].itime,
		},
		connected: playersConnected,
		playersOnline: playersOnline,
		maxPlayersOnline: maxPlayersOnline,
	};
}

async function dataCollector()
{
	if (playersConnected === null) {
		await initPlayerConnected();
		for (const player of playersConnected) {
			logs.info(`${player} is ${colors.green}connected${colors.end} based on last data.`);
		}
	}

	const data = await fetchData();

	// check server status and create new status if it was previously offline
	if ((data.status === true && serverOnline === false)) {
		serverRetry = 0;
		serverOnline = true;

		process.stdout.write("\033[2K");
		logs.info(`Server is ${colors.green}up${colors.end}!`);

		let ret = response.sql(await updateServerStatus(true), "Unable to create server status"); //todo
		if (ret === "error") {
			return { state: "error" };
		}
	}

	// retrying request n times
	if (data.status === false && serverOnline === true && serverRetry != parseInt(process.env.queryRetry))
	{
		serverRetry++;
		logs.warning(`Server not responding`);
		return { state: "partial" };
	}
	// server offline closing sessions and updating logtimes
	if (data.status === false && serverRetry == parseInt(process.env.queryRetry)) {
		serverRetry = 0;
		serverOnline = false;

		logs.info(`Server is ${colors.red}down${colors.end}!`);

		ret = response.sql(await updateServerStatus(false), "Unable to create server status"); //todo
		if (ret === "error") {
			return { state: "error" };
		}

		ret = response.sql(await endSessions(data), "Unable to update logtime and close sessions");
		if (ret === "error") {
			return { state: "error" };
		}

		// dispatch server disconnected
		return {
			state: "success",
			timestamp: time.getTimestamp(),
			serverStatus: {
				online: serverOnline,
				since: time.getTimestamp(),
			},
			connected: [],
			playersOnline: 0,
			maxPlayersOnline: maxPlayersOnline,
		};
	}

	// waiting for server to respond
	if ((data.status === false && serverOnline === false)) {
		return { state: "partial" };
	}

	serverRetry = 0;

	if (serverOnline === true && data.player_names.length !== playersConnected.length) {
		let ret = await newSessions(data);
		if (ret.state === "error") {
			return { state: "error" };
		}

		ret = await endSessions(data);
		if (ret.state === "error") {
			return { state: "error" };
		}
		await initPlayerConnected();
	}

	mcVersion = data.version;
	// playersOnline++
	playersOnline = data.player_names.length;
	if (maxPlayersOnline < playersOnline) {
		maxPlayersOnline = playersOnline;
	}

	// dispatch new / removed users
	return await generateReturn(data);
}

///////////////////////////// Sessions

async function newSessions(data)
{
	let player_names = data.player_names;
	if (player_names === undefined) {
		player_names = [];
	}

	if (player_names.length < playersConnected.length) {
		return { state: "partial" };
	}

	let diff = player_names.filter(x => !playersConnected.includes(x));
	for (const player of diff) {
		const ret = response.sql(await pg.createSession(player), "Unable to create session for " + player);
		if (ret === "error") {
			return { state: "error" };
		}
		logs.info(`${player} is ${colors.green}connected${colors.end}!`);
	}

	return { state: "success" };
}

function calcLogtime(session, current)
{
	const timestamp = time.getTimestamp();
	const logtime = timestamp - parseInt(session.connection_time) + (typeof(current) === "object" ? parseInt(current.logtime) : 0);
	return logtime;
}

async function createLogtime(username)
{
	const session = response.sql(await pg.getPlayerSession(username), "Unable to get session for " + username);
	if (session === "error") {
		return { state: "error" };
	}

	let createLogtime = false;

	const logtime = response.sql(await pg.getLogtime(username), "Unable to get logtime for " + username);
	if (logtime === "error") {
		return { state: "error" };
	} else if (logtime === "empty") {
		createLogtime = true;
	}

	const newLogtime = calcLogtime(session, logtime)

	let ret = "error";
	// No records for current user .. creating one
	if (createLogtime === true) {
		ret = response.sql(await pg.createLogtime(username, newLogtime), "Unable to create logtime for " + username);
		if (ret === "error") {
			return { state: "error" };
		}
	} else {
	// updating existing records
		ret = response.sql(await pg.updateLogtime(username, newLogtime), "Unable to update logtime for " + username);
		if (ret === "error") {
			return { state: "error" };
		}
	}

	return { state: "success" };
}

async function endSessions(data)
{
	let player_names = data.player_names;
	if (player_names === undefined) {
		player_names = [];
	}

	if (player_names.length > playersConnected.length) {
		return { state: "nothing" };
	}

	let diff = playersConnected.filter(x => !player_names.includes(x));
	for (const player of diff) {
		let ret = response.sql(await createLogtime(player), "Unable to compute logtime for " + player);
		if (ret === "error") {
			return { state: "error" };
		}

		ret = response.sql(await pg.removeSession(player), "Unable to end session for " + player);
		if (ret === "error") {
			return { state: "error" };
		}

		logs.info(`${player} is ${colors.red}disconnected${colors.end}!`);
	}

	playersConnected = player_names.filter(x => !playersConnected.includes(x));

	return { state: "success" };
}

/////////////////////////////

async function updatePlayersOnline()
{
	logs.info(`current: [ ${playersOnline} / 60 ] max: ${maxPlayersOnline}`);
	const ret = response.sql(await pg.createPlayersOnline(maxPlayersOnline), "Unable to store player value");
	if (ret === "error") {
		return { state: "error" };
	}
	let tmp_maxPlayersOnline = maxPlayersOnline;
	maxPlayersOnline = 0;
	return {
		state: "success",
		maxPlayersOnline: tmp_maxPlayersOnline,
	};
}

async function initWebsocketData()
{
	const	playersSessions			= response.sql(await pg.getPlayersSessions()),
			serverStatus			= response.sql(await pg.getServerStatus()),
			playersLogitmesHistory	= response.sql(await pg.getLogtimeHistory()),
			playersLogtimesCurrent	= response.sql(await pg.getLogtimes()),
			playersOnlineHistory	= response.sql(await pg.getPlayersOnline());

	if (utils.oneOfEachAs("error", playersSessions, serverStatus, playersLogitmesHistory, playersLogtimesCurrent, playersOnlineHistory)) {
		return { state: "error" };
	}

	let ret = {
		type: "init",
		version: [mcVersion, mcBedrockVersion],
		uptime: { sessions: [] },
		players: [],
		daily: []
	}

	// uptime: {
    //     sessions: [
    //         { up, down },
    //     ],
    // }
	if (serverStatus === "empty") {
		ret.uptime.sessions.push({
			up: time.getTimestamp(),
			down: 0,
		});
	} else {
		for (let i = 0; i < serverStatus.length; i++) {
			let session = {
				up: 0,
				down: 0,
			}
			if (i == 0 && serverStatus[i].value === false) {
				continue;
			} else if (serverStatus[i + 1]) {
				session.up = serverStatus[i].itime;
				session.down = serverStatus[++i].itime;
			} else {
				session.up = serverStatus[i].itime;
				session.down = 0;
			}
			session.up = parseInt(session.up);
			session.down = parseInt(session.down);
			ret.uptime.sessions.push(session);
		}
	}
	// players: [
    //     {
    //         username,
    //         data: [
	//				{ date, logtime },
    //         ],
    //         todayLogtime,
    //     },
    // ]
	// from history in database
	for (const history of playersLogitmesHistory) {
		for (const i in history.username) {
			const username = history.username[i];
			// skip duplicate username of each days
			const duplicate = ret.players.filter(x => x.username === username);
			if (duplicate.length != 0) {
				continue;
			}

			let player = {
				username: username,
				data: [],
				todayLogtime: 0,
			};

			for (const x in playersLogitmesHistory) {
				const logtime = playersLogitmesHistory[x].logtime[i];
				player.data.push({
					date: playersLogitmesHistory[x].itime,
					logtime: logtime ? parseInt(logtime) : 0,
				});
			};
			const todayLogtime = () => {
				const logtimeHistory = player.data[player.data.length - 1];
				const find = playersSessions.filter(s => s.username === username);
				if (find.length == 1) {
					return calcLogtime(find[0], logtimeHistory);
				}
				return logtimeHistory.logtime;
			}
			player.todayLogtime = todayLogtime();
			ret.players.push(player);
		}
	}
	// from today new values not in history
	for (const logtime of playersLogtimesCurrent) {
		const username = logtime.username;
		const duplicate = ret.players.filter(x => x.username === username);
		if (duplicate.length != 0) {
			continue;
		}
		let player = {
			username: username,
			data: [],
			todayLogtime: 0,
		};
		const todayLogtime = () => {
			const find = playersSessions.filter(s => s.username === username);
			if (find.length == 1) {
				return calcLogtime(find[0], logtime);
			}
			return logtime.logtime;
		}
		player.todayLogtime = todayLogtime();
		ret.players.push(player);
	}

	// daily: [
	// 	{ date, maxPlayers },
    // ]
	for (const data of playersOnlineHistory) {
		let daily = {
			date: data.itime,
			maxPlayers: data.value,
		};
		ret.daily.push(daily);
	}

	return {
		state: "success",
		init: ret,
		playersConnected: playersSessions.length !== 0 ? utils.extractJSON(playersSessions, "username") : [],
	};
}

// const t = {
//     type: "init",
//     uptime: {
//         sessions: [
//             {
//                 up: 135236146,
// 				down: 2352523,
//             },
//             {
//                 up: 135236146,
//                 down: 2352523,
//             }
//         ],
//     },
//     players: [
//         {
//             username: "toon_lien",
//             data: [
//                 { date: "2022-05-25", logtime: 50 },
//                 { date: "2022-05-26", logtime: 30 },
//             ],
//             todayLogtime: 10
//         },
//     ],
//     daily: [
// 		{ date: "2022-05-25", maxPlayers: 10 },
// 		{ date: "2022-05-26", maxPlayers: 7 },
//     ],
// };

setInterval(async() => {
	fetchBedrockVersion();

	const t = time.getTime().split(":")
	const hours = parseInt(t[0]);
	const mins = parseInt(t[1]);
	if (hours % 6 || (hours % 6 === 0 && mins % 60)) {
		return ;
	}

	const ret = updatePlayersOnline();
	if (ret.state !== "error") {
		logs.info("Players online history successfully created.");
		websocket.sendMaxPlayers(ret);
	}
}, 60000);

module.exports.dataCollector = dataCollector;
module.exports.initWebsocketData = initWebsocketData;
