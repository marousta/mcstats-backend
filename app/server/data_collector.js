const pg		= require('./sql.js');
const utils		= require('./utils.js');
const config	= require('../config.js');
const spawn		= require('child_process').spawn;

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

// {
// 	status: true,
// 	version: 'Paper 1.18.2',
// 	protocol: 758,
// 	description: 'cube',
// 	players_online: 0,
// 	max_players: 60,
// 	player_names: []
// }

let playersConnected = null;

async function initPlayerConnected()
{
	let ret = await pg.getPlayersSessions();

	if (ret.state !== "success") {
		log.error(["initPlayerConnected", "Unable to init playersConnected"]);
		process.exit();
	}
	playersConnected = ret.content;
}

async function dataCollector()
{
	if (!playersConnected) {
		await initPlayerConnected();
	}

	const data = await fetchData(config.execPath, [config.serverURL]);
	console.log(data);

	if (data.player_names.length !== playersConnected.length) {
		let ret = await newSessions();
		if (ret.state !== "success") {
			utils.log.error(["dataCollector", "Unable to update sessions"]);
			return { state: "error" }
		}

		ret = await endSessions();
		if (ret.state !== "success") {
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

async function newSessions()
{
	const player_names = data.player_names;
	if (player_names.length < playersConnected.length) {
		return;
	}

	let diff = player_names.filter(x => !playersConnected.includes(x));
	for (const player of diff) {
		const ret = await pg.createSession(player);

		if (ret.state !== "success") {
			utils.log.error(["newSessions", "Unable to create session for " + player]);
			return { state: "error" }
		}
	}

	return { state: "success" }
}

async function computeLogtime(username)
{
	const session = await pg.getPlayerSession(username);
	if (session !== "success") {
		utils.error.log(["computeLogtime", "Unable to get session for " + username]);
		return { state: "error" }
	}

	logtime = await pg.getLogtime(username);
	if (logtime !== "success") {
		utils.error.log(["computeLogtime", "Unable to get logtime for " + username]);
		return { state: "error" }
	}

	const timestamp = utils.getTimestamp();
	const newLogtime = timestamp - session.content + logtime.content;

	// No records for current user .. creating one
	if (logtime.content.length !== 0) {
		ret = await pg.createLogtime(username, newLogtime);
		if (ret !== "success") {
			utils.error.log(["computeLogtime", "Unable to create logtime for " + username]);
			return { state: "error" }
		}
	} else {
	// updating existing records
		ret = await pg.updateLogtime(username, newLogtime);
		if (ret !== "success") {
			utils.error.log(["computeLogtime", "Unable to update logtime for " + username]);
			return { state: "error" }
		}
	}

	return { state: "success" }
}

async function endSessions()
{
	const player_names = data.player_names;
	if (player_names.length > playersConnected.length) {
		return;
	}

	let diff = playersConnected.filter(x => !player_names.includes(x));
	for (const player of diff) {

		let ret = await computeLogtime(player);
		if (ret.state !== "success") {
			utils.log.error(["endSessions", "Unable to compute logtime for " + player]);
			return { state: "error" }
		}

		ret = await pg.removeSession(player);
		if (ret.state !== "success") {
			utils.log.error(["endSessions", "Unable to end session for " + player]);
			return { state: "error" }
		}
	}

	return { state: "success" }
}

module.exports.dataCollector = dataCollector;
