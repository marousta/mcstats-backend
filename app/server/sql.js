const postgres		= require('pg-native');
const ProgressBar	= require('progress');
const utils			= require('./utils.js');
const config		= require('../config.js').psql;

//Connect to postgresql database
const pg = new postgres();
try {
	pg.connectSync(config);
	console.log("Connected to database.");
}
catch (e) {
	utils.log.error("Unable to connect to postgresql database. Please check configuration or start the server !");
	process.exit();
}

function response_error(error)
{
	let response = {
		state: "error",
		message: "undefined error",
	};
	if (!error) {
		return response;
	}

	if (typeof error == "string") {
		response.message = error;
		return response;
	}

	const e = error.message.split("\n");
	const message = e[0];
	const details = e[1];

	if (message.includes("prepared statement", "already exists")) {
		response.message = "Retry";
	}
	// utils.log.error(["response_error", error]);
	return response;
}

function response_success(content = null)
{
	return {
		state: "success",
		content: content,
	};
}

function response_partial(message = null)
{
	return {
		state: "partial",
		message: message,
	};
}

/////////////////////////////

async function getPlayersSessions()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username
			FROM public.players_sessions
		`);
		rows = pg.executeSync(transID);
		return response_success(rows);
	} catch (e) {
		utils.log.error(["getPlayersSessions", "request failed", e]);
		return response_error(e);
	};
}

async function getPlayerSession(username)
{
	const transID = utils.getTransID();

	if (username === undefined) {
		return response_error("username undefined");
	}

	try {
		pg.prepareSync(transID, `
			SELECT connection_time
			FROM public.players_sessions
			WHERE username='${username}'
		`);
		rows = pg.executeSync(transID);
		if (rows.length > 1) {
			throw Error("multiple user with the same name");
		}
		if (rows.length === 0) {
			return response_partial("No session found for " + username);
		}
		return response_success(rows[0]);
	} catch (e) {
		utils.log.error(["getPlayerSession", "request failed", e]);
		return response_error(e);
	};
}

async function createSession(username)
{
	const transID = utils.getTransID();

	if (username === undefined) {
		return response_error("username undefined");
	}

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.players_sessions
			(username, connection_time)
			VALUES ('${username}', ${utils.getTimestamp()})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["createSession", "insert failed", e]);
		return response_error(e);
	};
}

async function removeSession(username)
{
	const transID = utils.getTransID();

	if (username === undefined) {
		return response_error("username undefined");
	}

	try {
		pg.prepareSync(transID, `
			DELETE FROM public.players_sessions
			WHERE username='${username}'
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["createSession", "delete failed", e]);
		return response_error(e);
	};
}

/////////////////////////////

async function getLogtime(username)
{
	const transID = utils.getTransID();

	if (username === undefined) {
		return response_error("username undefined");
	}

	try {
		pg.prepareSync(transID, `
			SELECT logtime
			FROM public.players_logtime
			WHERE username='${username}'
		`);
		rows = pg.executeSync(transID);
		if (rows.length > 1) {
			throw Error("multiple user with the same name");
		}
		if (rows.length === 0) {
			return response_partial("No logtime found for " + username);
		}
		return response_success(rows[0]); //Todo
	} catch (e) {
		utils.log.error(["getLogtime", "request failed", e]);
		return response_error(e);
	};
}

async function createLogtime(username, logtime)
{
	const transID = utils.getTransID();

	if (username === undefined || logtime === undefined) {
		return response_error(`${username} ${logtime} => undefined`);
	}

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.players_logtime
			(username, logtime)
			VALUES ('${username}', ${logtime})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["createLogtime", "insert failed", e]);
		return response_error(e);
	};
}

async function updateLogtime(username, logtime)
{
	const transID = utils.getTransID();

	if (username === undefined || logtime === undefined) {
		return response_error(`${username} ${logtime} => undefined`);
	}

	try {
		pg.prepareSync(transID, `
			UPDATE public.players_logtime
			SET logtime=${logtime}
			WHERE username='${username}'
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["updateLogtime", "insert failed", e]);
		return response_error(e);
	};
}

module.exports.getPlayersSessions = getPlayersSessions;
module.exports.getPlayerSession = getPlayerSession;
module.exports.createSession = createSession;
module.exports.removeSession = removeSession;

module.exports.getLogtime = getLogtime;
module.exports.createLogtime = createLogtime;
module.exports.updateLogtime = updateLogtime;
