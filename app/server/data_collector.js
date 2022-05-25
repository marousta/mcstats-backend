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

///////////////////////////// dataCollect

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

let playersConnected = null;

async function initPlayerConnected()
{
	let ret = await pg.getPlayersSessions();

	if (ret.state === "error") {
		log.error(["initPlayerConnected", "Unable to init playersConnected"]);
		process.exit();
	}
	playersConnected = utils.extractJSON(ret.content, "username");
}

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

	// server offline closing sessions and updating logtimes
	if (data.status === false) {
		ret = await endSessions(data);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to update logtime and close sessions"]);
			return { state: "error" }
		}
	}

	if (data.player_names.length !== playersConnected.length) {
		let ret = await newSessions(data);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to update sessions"]);
			return { state: "error" }
		}

		ret = await endSessions(data);
		if (ret.state === "error") {
			utils.log.error(["dataCollector", "Unable to update logtime and close sessions"]);
			return { state: "error" }
		}
		await initPlayerConnected();
	}

	return {
		state: "success",
		content: data,
	};
}

///////////////////////////// Sessions

async function newSessions(data)
{
	const player_names = data.player_names;
	if (player_names.length < playersConnected.length) {
		return { state: "nothing" }
	}

	let diff = player_names.filter(x => !playersConnected.includes(x));
	for (const player of diff) {
		utils.log.info(`${player} is ${utils.colors.green}connected${utils.colors.end}!`);

		const ret = await pg.createSession(player);
		if (ret.state === "error") {
			utils.log.error(["newSessions", "Unable to create session for " + player]);
			return { state: "error" }
		}
	}

	return { state: "success" }
}

async function computeLogtime(username)
{
	const session = await pg.getPlayerSession(username);
	if (session.state === "error") {
		utils.log.error(["computeLogtime", "Unable to get session for " + username]);
		return { state: "error" }
	}

	let createLogtime = false;

	logtime = await pg.getLogtime(username);
	if (logtime.state === "error") {
		utils.log.error(["computeLogtime", "Unable to get logtime for " + username]);
		return { state: "error" }
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
			return { state: "error" }
		}
	} else {
	// updating existing records
		ret = await pg.updateLogtime(username, newLogtime);
		if (ret.state === "error") {
			utils.log.error(["computeLogtime", "Unable to update logtime for " + username]);
			return { state: "error" }
		}
	}

	return { state: "success" }
}

async function endSessions(data)
{
	const player_names = data.player_names;
	if (player_names.length > playersConnected.length) {
		return { state: "nothing" }
	}

	let diff = playersConnected.filter(x => !player_names.includes(x));
	for (const player of diff) {
		utils.log.info(`${player} is ${utils.colors.red}disconnected${utils.colors.end}!`);

		let ret = await computeLogtime(player);
		if (ret.state === "error") {
			utils.log.error(["endSessions", "Unable to compute logtime for " + player]);
			return { state: "error" }
		}

		ret = await pg.removeSession(player);
		if (ret.state === "error") {
			utils.log.error(["endSessions", "Unable to end session for " + player]);
			return { state: "error" }
		}
	}

	return { state: "success" }
}

module.exports.dataCollector = dataCollector;
