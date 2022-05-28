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

///////////////////////////// response

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

///////////////////////////// Sessions
////////////// get

async function getPlayersSessions()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username, connection_time
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

////////////// insert

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

////////////// delete

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

///////////////////////////// Logtime
////////////// get

async function getLogtimes()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username, logtime
			FROM public.players_logtime
		`);
		rows = pg.executeSync(transID);
		if (rows.length === 0) {
			return response_partial("No logtime found");
		}
		return response_success(rows);
	} catch (e) {
		utils.log.error(["getLogtimes", "request failed", e]);
		return response_error(e);
	};
}

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
		return response_success(rows[0]);
	} catch (e) {
		utils.log.error(["getLogtime", "request failed", e]);
		return response_error(e);
	};
}

////////////// insert

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

////////////// update

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

///////////////////////////// Players online
////////////// get

async function getPlayersOnline()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT itime, value
			FROM public.players_online
		`);
		rows = pg.executeSync(transID);
		if (rows.length === 0) {
			return response_partial("No player online data found");
		}
		return response_success(rows);
	} catch (e) {
		utils.log.error(["getPlayersOnline", "request failed", e]);
		return response_error(e);
	};
}

////////////// insert

async function createPlayersOnline(value)
{
	const transID = utils.getTransID();

	if (value === undefined) {
		return response_error("value undefined");
	}

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.players_online
			(itime, value)
			VALUES ('${utils.getTimestamp()}', ${value})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["createPlayersOnline", "insert failed", e]);
		return response_error(e);
	};
}

///////////////////////////// Server status
////////////// get

async function getServerStatus(limit = 0)
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT itime, value
			FROM public.server_uptime
			ORDER BY id DESC ${limit ? "LIMIT " + limit : ""}
		`);
		rows = pg.executeSync(transID);
		if (rows.length === 0) {
			return response_partial("No server data found");
		}
		return response_success(rows);
	} catch (e) {
		utils.log.error(["getServerStatus", "request failed", e]);
		return response_error(e);
	};
}

////////////// insert

async function createServerStatus(value)
{
	const transID = utils.getTransID();

	if (value === undefined) {
		return response_error("value undefined");
	}

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.server_uptime
			(itime, value)
			VALUES ('${utils.getTimestamp()}', ${value})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["createServerStatus", "insert failed", e]);
		return response_error(e);
	};
}

///////////////////////////// Logtime history
////////////// get

async function getLogtimeHistory(limit = 0)
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username, logtime, itime
			FROM public.logtime_history
			ORDER BY id ASC
		`);
		rows = pg.executeSync(transID);
		if (rows.length === 0) {
			return response_partial("No logtime history found");
		}
		return response_success(rows);
	} catch (e) {
		utils.log.error(["getLogtimeHistory", "request failed", e]);
		return response_error(e);
	};
}

////////////// insert

async function createLogtimeHistory()
{
	const transID = utils.getTransID();

	let ret = await getLogtimes();
	if (ret.state === "error") {
		utils.log.error(["createLogtimeHistory", "getLogtimes failed"]);
		return response_error();
	}

	console.log(ret.content);
	let username = utils.stringifyArraySQL( utils.extractJSON(ret.content, "username") );
	let logtime = utils.stringifyArraySQL( utils.extractJSON(ret.content, "logtime"), "\"", "" );

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.logtime_history
			(username, logtime, itime)
			VALUES (ARRAY${username}, ARRAY${logtime}, NOW()::date)
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		utils.log.error(["createLogtimeHistory", "insert failed", e]);
		return response_error(e);
	};
}

setInterval(async() => {
	if (utils.getTime() !== "00:00") {
		return ;
	}

	const ret = createLogtimeHistory();
	if (ret.state == "error") {
		//
	}
}, 60000);

module.exports.getPlayersSessions = getPlayersSessions;
module.exports.getPlayerSession = getPlayerSession;
module.exports.createSession = createSession;
module.exports.removeSession = removeSession;

module.exports.getLogtimes = getLogtimes;
module.exports.getLogtime = getLogtime;
module.exports.createLogtime = createLogtime;
module.exports.updateLogtime = updateLogtime;

module.exports.getLogtimeHistory = getLogtimeHistory;

module.exports.getPlayersOnline = getPlayersOnline;
module.exports.createPlayersOnline = createPlayersOnline;

module.exports.getServerStatus = getServerStatus;
module.exports.createServerStatus = createServerStatus;
