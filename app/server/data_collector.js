const pg		= require('./sql.js');
const utils		= require('./utils.js');
const config	= require('../config.js');
const spawn		= require('child_process').spawn;

const _null = {
	status: true,
	version: 'Paper 1.18.2',
	protocol: 758,
	description: 'cube',
	players_online: 0,
	max_players: 60,
	player_names: []
};

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
				utils.log.error(["FetchData", "JSON parse error", data]);
				process.exit();
			}
		});
		p.on("error", (e) => {
			utils.log.error(["fetchData", "Unable to execute " + exec + " file not found"])
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
		utils.log.error(["updateServerStatus", "Unable to get server status"]);
		return { state: "error" };
	} else if (ret.state === "partial") { // no database entry create one based on current server status
		utils.log.info(["updateServerStatus", ret.message]);

		ret = await pg.createServerStatus(status);
		if (ret.state === "error") {
			utils.log.error(["updateServerStatus", "Unable to create default server status", ret.message]);
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
		utils.log.error(["updateServerStatus", "Unable to create server status"]);
		return { state: "error" };
	}
	return { state: "success" };
}

async function initPlayerConnected()
{
	let ret = await pg.getPlayersSessions();

	if (ret.state === "error") {
		log.error(["initPlayerConnected", "Unable to init playersConnected"]);
		process.exit();
	}
	playersConnected = utils.extractJSON(ret.content, "username");
}

///////////////////////////// dataCollect

async function dataCollector()
{
	if (!playersConnected) {
		await initPlayerConnected();
		for (const player of playersConnected) {
			utils.log.info(`${player} is ${utils.colors.green}connected${utils.colors.end}!`);
		}
	}

	const data = await fetchData(config.execPath, [config.serverURL]);
	// console.log(data);

	// check server status and create new status if it was previously offline
	if (data.status === true && serverOnline === false) {
		serverOnline = true;
		utils.log.info(`Server is ${utils.colors.green}up${utils.colors.end}!`);

		let ret = await updateServerStatus(data.status);
		if (ret.status === "error") {
			utils.log.error(["dataCollector", "Unable to update server status"]);
			return { state: "error" };
		}
	}

	// server offline closing sessions and updating logtimes
	if (data.status === false && serverOnline === true) {
		serverOnline = false;
		utils.log.info(`Server is ${utils.colors.red}down${utils.colors.end}!`);

		ret = await pg.createServerStatus(false);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to create server status"]);
			return { state: "error" };
		}

		ret = await endSessions(data);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to update logtime and close sessions"]);
			return { state: "error" };
		}

		return {
			state: "success",
			content: data, //todo
		};
	}

	if (serverOnline === true && data.player_names.length !== playersConnected.length) {
		let ret = await newSessions(data);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to update sessions"]);
			return { state: "error" };
		}

		ret = await endSessions(data);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to update logtime and close sessions"]);
			return { state: "error" };
		}
		await initPlayerConnected();
	}

	playersOnline = data.player_names.length;
	if (maxPlayersOnline < playersOnline) {
		maxPlayersOnline = playersOnline;
	}

	return {
		state: "success",
		content: data, //todo
	};
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
		utils.log.info(`${player} is ${utils.colors.green}connected${utils.colors.end}!`);

		const ret = await pg.createSession(player);
		if (ret.state === "error") {
			utils.log.error(["newSessions", "Unable to create session for " + player]);
			return { state: "error" };
		}
	}

	return { state: "success" };
}

async function computeLogtime(username)
{
	const session = await pg.getPlayerSession(username);
	if (session.state === "error") {
		utils.log.error(["computeLogtime", "Unable to get session for " + username]);
		return { state: "error" };
	}

	let createLogtime = false;

	logtime = await pg.getLogtime(username);
	if (logtime.state === "error") {
		utils.log.error(["computeLogtime", "Unable to get logtime for " + username]);
		return { state: "error" };
	} else if (logtime.state === "partial") {
		utils.log.info(["computeLogtime", logtime.message]);
		createLogtime = true;
	}

	const timestamp = utils.getTimestamp();
	const newLogtime = timestamp - parseInt(session.content.connection_time) + (logtime.content ? parseInt(logtime.content.logtime) : 0);

	// No records for current user .. creating one
	if (createLogtime === true) {
		ret = await pg.createLogtime(username, newLogtime);
		if (ret.state === "error") {
			utils.log.error(["computeLogtime", "Unable to create logtime for " + username]);
			return { state: "error" };
		}
	} else {
	// updating existing records
		ret = await pg.updateLogtime(username, newLogtime);
		if (ret.state === "error") {
			utils.log.error(["computeLogtime", "Unable to update logtime for " + username]);
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
		utils.log.info(`${player} is ${utils.colors.red}disconnected${utils.colors.end}!`);

		let ret = await computeLogtime(player);
		if (ret.state === "error") {
			utils.log.error(["endSessions", "Unable to compute logtime for " + player]);
			return { state: "error" };
		}

		ret = await pg.removeSession(player);
		if (ret.state === "error") {
			utils.log.error(["endSessions", "Unable to end session for " + player]);
			return { state: "error" };
		}
	}

	playersConnected = player_names.filter(x => !playersConnected.includes(x));

	return { state: "success" };
}

async function updatePlayersOnline()
{
	utils.log.info(`current: [ ${playersOnline} / 60 ] max: ${maxPlayersOnline}`);
	const ret = await pg.createPlayersOnline(maxPlayersOnline);
	if (ret.state === "error") {
		utils.log.error(["updatePlayersOnline", "Unable to store player value"]);
		return { state: "error" };
	}
	maxPlayersOnline = playersOnline;
	return { state: "success" };
}

setInterval(async() => {
	if (utils.getTime() !== "00:00") {
		return ;
	}

	const ret = updatePlayersOnline();
	if (ret.state == "error") {
		//
	}
}, 60000);

module.exports.dataCollector = dataCollector;
