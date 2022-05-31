const pg			= require('./sql.js');
const utils			= require('./utils/utils.js');
const logs			= require('./utils/logs.js');
const time			= require('./utils/time.js');
const colors		= require('./utils/colors.js');
const response		= require('./utils/response.js');
const websocket		= require('./websocket.js');
const spawn			= require('child_process').spawn;

// const _null = {
// 	status: true,
// 	version: 'Paper 1.18.2',
// 	protocol: 758,
// 	description: 'cube',
// 	players_online: 0,
// 	max_players: 60,
// 	player_names: []
// };

/////////////////////////////

function fetchData(exec, args)
{
	return new Promise((resolve) => {
		let p = spawn(exec, args);

		p.stdout.setEncoding('utf8');
		p.stdout.on('data', (data) => {
			try {
				let jsonData = JSON.parse(data);
				resolve(jsonData);
			} catch {
				logs.fatal("JSON parse error " + data)
			}
		});
		p.on("error", (e) => {
			logs.fatal("Unable to execute " + exec + " file not found")
		});
	})
}

///////////////////////////// init

let playersConnected = null;
let playersOnline = 0;
let maxPlayersOnline = 0;
let serverOnline = false;

async function updateServerStatus(status)
{
	// get previous server status
	let ret = response.sql(await pg.getServerStatus(1), "Unable to get server status");
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

	// server offline in database, updating ..
	ret = response.sql(await pg.createServerStatus(true), "Unable to create server status");
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

	const data = await fetchData(process.env.execPath, [process.env.serverURL]);
	// console.log(data);

	// check server status and create new status if it was previously offline
	if (data.status === true && serverOnline === false) {
		serverOnline = true;
		logs.info(`Server is ${colors.green}up${colors.end}!`);

		let ret = response.sql(await updateServerStatus(data.status), "Unable to update server status");
		if (ret === "error") {
			return { state: "error" };
		}
	}

	// server offline closing sessions and updating logtimes
	if (data.status === false && serverOnline === true) {
		serverOnline = false;
		logs.info(`Server is ${colors.red}down${colors.end}!`);

		ret = response.sql(await pg.createServerStatus(false), "Unable to create server status");
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
	if (data.status === false && serverOnline === false) {
		return { state: "partial" };
	}

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
		logs.info(`${player} is ${colors.green}connected${colors.end}!`);

		const ret = response.sql(await pg.createSession(player), "Unable to create session for " + player);
		if (ret === "error") {
			return { state: "error" };
		}
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
		logs.info(`${player} is ${colors.red}disconnected${colors.end}!`);

		let ret = response.sql(await createLogtime(player), "Unable to compute logtime for " + player);
		if (ret === "error") {
			return { state: "error" };
		}

		ret = response.sql(await pg.removeSession(player), "Unable to end session for " + player);
		if (ret === "error") {
			return { state: "error" };
		}
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
		uptime: { sessions: [] },
		players: [],
		daily: []
	}

	// uptime: {
    //     sessions: [
    //         { up, down },
    //     ],
    // }
	for (let i in serverStatus) {
		let session = {
			up: 0,
			down: 0,
		}
		if (i === 0 && serverStatus[i].value === true) {
			session.down = 0;
			session.up = serverStatus[i].itime;
		} else {
			if (serverStatus[i + 1]) {
				session.down = serverStatus[i].itime;
				session.up = serverStatus[++i].itime;
			} else {
				session.down = 0;
				session.up = serverStatus[i].itime;
			}
		}
		ret.uptime.sessions.push(session);
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
	// console.log(playersLogitmesHistory);
	for (const history of playersLogitmesHistory) {
		for (const i in history.username) {
			const username = history.username[i];
			const duplicate = ret.players.filter(x => x.username === username)
			if (duplicate.length !== 0) {
				continue;
			}
			let player = {
				username: username,
				data: [],
				todayLogtime: playersSessions.length !== 0 ? calcLogtime(playersSessions, history.logtime[i]) : history.logtime[i],
			};
			for (const x in playersLogitmesHistory) {
				player.data.push({
					date: playersLogitmesHistory[x].itime,
					logtime: playersLogitmesHistory[x].logtime[i],
				});
			};
			ret.players.push(player);
		}
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
