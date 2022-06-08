const postgres		= require('pg-native');
const utils			= require('./utils/utils.js');
const logs			= require('./utils/logs.js');
const time			= require('./utils/time.js');
const response		= require('./utils/response.js');

//Connect to postgresql database
const pg = new postgres();
const config = `postgresql://${process.env.postgresUser}:${process.env.postgresPassword}@${process.env.postgresHost}/${process.env.postgresDatabase}?${process.env.postgresOptions}`;
try {
	pg.connectSync(config);
	logs.info("Connected to database.");
}
catch (e) {
	logs.error(config);
	logs.error(e.message);
	logs.fatal("Unable to connect to postgresql database.");
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
	response.message = error.message;
	// logs.error(error);
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
		return response_error(e);
	}
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
		if (rows.length == 0) {
			return response_partial("No session found for " + username);
		}
		return response_success(rows[0]);
	} catch (e) {
		return response_error(e);
	}
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
			VALUES ('${username}', ${time.getTimestamp()})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		return response_error(e);
	}
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
		return response_error(e);
	}
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
			ORDER by username
		`);
		rows = pg.executeSync(transID);
		if (rows.length == 0) {
			return response_partial("No logtime found");
		}
		return response_success(rows);
	} catch (e) {
		return response_error(e);
	}
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
		if (rows.length == 0) {
			return response_partial("No logtime found for " + username);
		}
		return response_success(rows[0]);
	} catch (e) {
		return response_error(e);
	}
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
		return response_error(e);
	}
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
		return response_error(e);
	}
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
		if (rows.length == 0) {
			return response_partial("No player online data found");
		}
		return response_success(rows);
	} catch (e) {
		return response_error(e);
	}
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
			VALUES ('${time.getTimestamp()}', ${value})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		return response_error(e);
	}
}

///////////////////////////// Server status
////////////// get

async function getServerStatus(limit = 0, order = "ASC")
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT itime, value
			FROM public.server_uptime
			ORDER BY id ${order} ${limit ? "LIMIT " + limit : ""}
		`);
		rows = pg.executeSync(transID);
		if (rows.length == 0) {
			return response_partial("No server data found");
		}
		return response_success(rows);
	} catch (e) {
		return response_error(e);
	}
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
			VALUES ('${time.getTimestamp()}', ${value})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		return response_error(e);
	}
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
		if (rows.length == 0) {
			return response_partial("No logtime history found");
		}
		return response_success(rows);
	} catch (e) {
		return response_error(e);
	}
}

////////////// insert

async function createLogtimeHistory()
{
	const transID = utils.getTransID();

	let ret = response.sql(await getLogtimes(), "getLogtimes failed");
	if (ret === "error") {
		return response_error();
	}
	if (ret === "empty") {
		return response_partial();
	}

	let username = utils.stringifyArraySQL( utils.extractJSON(ret, "username") );
	let logtime = utils.stringifyArraySQL( utils.extractJSON(ret, "logtime"), "\"", "" );

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.logtime_history
			(username, logtime, itime)
			VALUES (ARRAY${username}, ARRAY${logtime}, NOW()::date)
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e) {
		return response_error(e);
	}
}

// for development purposes only, use as your own risk
function deleteTable(table)
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			DELETE FROM public.${table}
		`);
		pg.executeSync(transID);
		logs.warning(table);
		return response_success();
	} catch (e) {
		logs.error("delete failed for " + table);
		return response_error(e);
	};
}

function RESETDATABASE()
{
	let i = 0;
	let ticker = setInterval(() => {
		logs.warning("RESETDATABASE is ENABLED");
		if (++i === 7) {
			clearInterval(ticker);
		}
	}, 1000);
	setTimeout(async() => {
		logs.warning("Reset in progress..");

		let ret = [
			response.sql(await deleteTable("logtime_history")),
			response.sql(await deleteTable("players_logtime")),
			response.sql(await deleteTable("players_online")),
			response.sql(await deleteTable("players_sessions")),
			response.sql(await deleteTable("server_uptime")),
		];
		if (utils.oneOfEachAs("error", ret) === false) {
			logs.warning("Reset complete!");
			process.exit(0);
		}
	}, 7500);
}

// RESETDATABASE();

setInterval(async() => {
	if (time.getTime() !== "00:00") {
		return ;
	}

	const ret = await createLogtimeHistory();
	if (ret.state === "success") {
		logs.info("Logtime history successfully created.");
	} else if (ret.state === "empty") {
		logs.info("No Logtime data to create logtime history.");
	} else {
		logs.warning("Failed to update logtime history.");
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
