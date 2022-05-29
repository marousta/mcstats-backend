const pg		= require('./sql.js');
const utils		= require('./utils/utils.js');
const logs		= require('./utils/logs.js');
const time		= require('./utils/time.js');
const colors	= require('./utils/colors.js');
const config	= require('../config.js');
const spawn		= require('child_process').spawn;

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
				logs.error(["FetchData", "JSON parse error", data]);
				process.exit();
			}
		});
		p.on("error", (e) => {
			logs.error(["fetchData", "Unable to execute " + exec + " file not found"])
			process.exit();
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
	let ret = await pg.getServerStatus(1);
	if (ret.state === "error") {
		logs.error(["updateServerStatus", "Unable to get server status"]);
		return { state: "error" };
	} else if (ret.state === "partial") { // no database entry create one based on current server status
		logs.info(["updateServerStatus", ret.message]);

		ret = await pg.createServerStatus(status);
		if (ret.state === "error") {
			logs.error(["updateServerStatus", "Unable to create default server status", ret.message]);
			return { state: "error" };
		}
		return { state: "success" };
	}

	// server database already up to date, nothing to do
	if (ret.content[0].value === status) {
		return { state: "success" };
	}

	// server offline in database, updating ..
	ret = await pg.createServerStatus(true);
	if (ret.status === "error") {
		logs.error(["updateServerStatus", "Unable to create server status"]);
		return { state: "error" };
	}
	return { state: "success" };
}

async function initPlayerConnected()
{
	let ret = await pg.getPlayersSessions();

	if (ret.state === "error") {
		logs.error(["initPlayerConnected", "Unable to init playersConnected"]);
		process.exit();
	}
	playersConnected = utils.extractJSON(ret.content, "username");
}

///////////////////////////// dataCollect

async function generateReturn(data)
{
	// probably overkill here
	let player_names = data.player_names;
	if (player_names === undefined) {
		player_names = [];
	}

	const since = await pg.getServerStatus(1);
	if (since.state === "error") {
		logs.error(["generateReturn", "Unable to get server status"]);
		return { state: "error" };
	}

	return {
		state: "success",
		timestamp: time.getTimestamp(),
		serverStatus: {
			online: serverOnline,
			since: since.content[0].itime,
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
			logs.info(`${player} is ${colors.green}connected${colors.end}!`);
		}
	}

	const data = await fetchData(config.execPath, [config.serverURL]);
	// console.log(data);

	// check server status and create new status if it was previously offline
	if (data.status === true && serverOnline === false) {
		serverOnline = true;
		logs.info(`Server is ${colors.green}up${colors.end}!`);

		let ret = await updateServerStatus(data.status);
		if (ret.status === "error") {
			logs.error(["dataCollector", "Unable to update server status"]);
			return { state: "error" };
		}
	}

	// server offline closing sessions and updating logtimes
	if (data.status === false && serverOnline === true) {
		serverOnline = false;
		logs.info(`Server is ${colors.red}down${colors.end}!`);

		ret = await pg.createServerStatus(false);
		if (ret.state === "error") {
			logs.error(["dataCollector", "Unable to create server status"]);
			return { state: "error" };
		}

		ret = await endSessions(data);
		if (ret.state === "error") {
			logs.error(["dataCollector", "Unable to update logtime and close sessions"]);
			return { state: "error" };
		}

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

	if (serverOnline === true && data.player_names.length !== playersConnected.length) {
		let ret = await newSessions(data);
		if (ret.state === "error") {
			logs.error(["dataCollector", "Unable to update sessions"]);
			return { state: "error" };
		}

		ret = await endSessions(data);
		if (ret.state === "error") {
			logs.error(["dataCollector", "Unable to update logtime and close sessions"]);
			return { state: "error" };
		}
		await initPlayerConnected();
	}

	// playersOnline++
	playersOnline = data.player_names.length;
	if (maxPlayersOnline < playersOnline) {
		maxPlayersOnline = playersOnline;
	}

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
		return { state: "nothing" };
	}

	let diff = player_names.filter(x => !playersConnected.includes(x));
	for (const player of diff) {
		logs.info(`${player} is ${colors.green}connected${colors.end}!`);

		const ret = await pg.createSession(player);
		if (ret.state === "error") {
			logs.error(["newSessions", "Unable to create session for " + player]);
			return { state: "error" };
		}
	}

	return { state: "success" };
}

function calcLogtime(session, current)
{
	const timestamp = time.getTimestamp();
	const logtime = timestamp - parseInt(session.connection_time) + (current ? parseInt(current.logtime) : 0);
	return logtime;
}

async function createLogtime(username)
{
	let session = await pg.getPlayerSession(username);
	if (session.state === "error") {
		logs.error(["createLogtime", "Unable to get session for " + username]);
		return { state: "error" };
	}
	session = session.content;

	let createLogtime = false;

	let logtime = await pg.getLogtime(username);
	if (logtime.state === "error") {
		logs.error(["createLogtime", "Unable to get logtime for " + username]);
		return { state: "error" };
	} else if (logtime.state === "partial") {
		logs.info(["createLogtime", logtime.message]);
		createLogtime = true;
	}
	logtime = logtime.current;

	const newLogtime = calcLogtime(session, logtime)

	// No records for current user .. creating one
	if (createLogtime === true) {
		ret = await pg.createLogtime(username, newLogtime);
		if (ret.state === "error") {
			logs.error(["createLogtime", "Unable to create logtime for " + username]);
			return { state: "error" };
		}
	} else {
	// updating existing records
		ret = await pg.updateLogtime(username, newLogtime);
		if (ret.state === "error") {
			logs.error(["createLogtime", "Unable to update logtime for " + username]);
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

		let ret = await createLogtime(player);
		if (ret.state === "error") {
			logs.error(["endSessions", "Unable to compute logtime for " + player]);
			return { state: "error" };
		}

		ret = await pg.removeSession(player);
		if (ret.state === "error") {
			logs.error(["endSessions", "Unable to end session for " + player]);
			return { state: "error" };
		}
	}

	playersConnected = player_names.filter(x => !playersConnected.includes(x));

	return { state: "success" };
}

async function updatePlayersOnline()
{
	logs.info(`current: [ ${playersOnline} / 60 ] max: ${maxPlayersOnline}`);
	const ret = await pg.createPlayersOnline(maxPlayersOnline);
	if (ret.state === "error") {
		logs.error(["updatePlayersOnline", "Unable to store player value"]);
		return { state: "error" };
	}
	maxPlayersOnline = playersOnline;
	return { state: "success" };
}

setInterval(async() => {
	if (time.getTime() !== "00:00") {
		return ;
	}

	const ret = updatePlayersOnline();
	if (ret.state == "error") {
		//
	}
}, 60000);

async function initWebsocketData()
{
	let playersSessions = await pg.getPlayersSessions();
	if (playersSessions.state === "error") {
		logs.error(["initWebsocketData", "get playersSessions failed"]);
		return { state: "error" };
	}
	playersSessions = playersSessions.content;

	let serverStatus = await pg.getServerStatus();
	if (serverStatus.state === "error") {
		logs.error(["initWebsocketData", "get serverStatus failed"]);
		return { state: "error" };
	}
	serverStatus = serverStatus.content;

	let playersLogitmesHistory = await pg.getLogtimeHistory();
	if (playersLogitmesHistory.state === "error") {
		logs.error(["initWebsocketData", "get playersLogitmesHistory failed"]);
		return { state: "error" };
	}
	playersLogitmesHistory = playersLogitmesHistory.content;

	let playersLogtimesCurrent = await pg.getLogtimes();
	if (playersLogtimesCurrent.state === "error") {
		logs.error(["initWebsocketData", "get playersLogtimesCurrent failed"]);
		return { state: "error" };
	}
	playersLogtimesCurrent = playersLogtimesCurrent.content;

	let playersOnlineHistory = await pg.getPlayersOnline();
	if (playersOnlineHistory.state === "error") {
		logs.error(["initWebsocketData", "get playersOnlineHistory failed"]);
		return { state: "error" };
	}
	playersOnlineHistory = playersOnlineHistory.content;

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
		playersConnected: playersSessions.length !== 0 ? utils.extractJSON(playersSessions) : null,
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

module.exports.dataCollector = dataCollector;
module.exports.initWebsocketData = initWebsocketData;
