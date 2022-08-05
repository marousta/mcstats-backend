const postgres = require('pg-native');

import { ErrorResponse, SuccessResponse, PartialResponse } from '$types';
import * as utils from '$utils/utils';
import { logs } from '$utils/logs';
import * as time from '$utils/time';
import * as response from '$utils/response';
import { IplayerLogtime, IplayerLogtimeHistory } from '../types';

//Connect to postgresql database
const pg = new postgres();
const config = `postgresql://${process.env.postgresUser}:${process.env.postgresPassword}@${process.env.postgresHost}/${process.env.postgresDatabase}?${process.env.postgresOptions}`;
try {
	pg.connectSync(config);
	logs.info("Connected to database.");
}
catch (e: any) {
	logs.fatal(`config: ${config}\n\n\t${e.message}\n\tUnable to connect to postgresql database.`);
}

///////////////////////////// response

function response_error(error: string | Error | undefined = undefined): ErrorResponse
{
	let response: ErrorResponse = {
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

function response_success(content: any[] | undefined = undefined): SuccessResponse
{
	return {
		state: "success",
		content: content,
	};
}

function response_partial(message: string = ""): PartialResponse
{
	return {
		state: "partial",
		message: message,
	};
}

///////////////////////////// Sessions
////////////// get

export async function getPlayersSessions()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username, connection_time
			FROM public.players_sessions
		`);
		const rows = pg.executeSync(transID);
		return response_success(rows);
	} catch (e: any) {
		return response_error(e);
	}
}

export async function getPlayerSession(username: string)
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
		const rows = pg.executeSync(transID);
		if (rows.length > 1) {
			throw Error("multiple user with the same name");
		}
		if (rows.length == 0) {
			return response_partial("No session found for " + username);
		}
		return response_success(rows[0]);
	} catch (e: any) {
		return response_error(e);
	}
}

////////////// insert

export async function createSession(username: string)
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
	} catch (e: any) {
		return response_error(e);
	}
}

////////////// delete

export async function removeSession(username: string)
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
	} catch (e: any) {
		return response_error(e);
	}
}

///////////////////////////// Logtime
////////////// get

export async function getLogtimes()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username, logtime
			FROM public.players_logtime
			ORDER by username ASC
		`);
		const rows = pg.executeSync(transID);
		if (rows.length == 0) {
			return response_partial("No logtime found");
		}

		let ret: Array<IplayerLogtime> = [];
		for (const row of rows) {
			ret.push({
				username: row.username,
				logtime: parseInt(row.logtime),
			});
		}

		return response_success(ret);
	} catch (e: any) {
		return response_error(e);
	}
}

export async function getLogtime(username: string)
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
		const rows = pg.executeSync(transID);
		if (rows.length > 1) {
			throw Error("multiple user with the same name");
		}
		if (rows.length == 0) {
			return response_partial("No logtime found for " + username);
		}

		const ret: Array<IplayerLogtime> = [{
			username: username,
			logtime: parseInt(rows[0].logtime),
		}];

		return response_success(ret);
	} catch (e: any) {
		return response_error(e);
	}
}

////////////// insert

export async function createLogtime(username: string, logtime: number)
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
	} catch (e: any) {
		return response_error(e);
	}
}

////////////// update

export async function updateLogtime(username: string, logtime: number)
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
	} catch (e: any) {
		return response_error(e);
	}
}

///////////////////////////// Players online
////////////// get

export async function getPlayersOnline()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT itime, value
			FROM public.players_online
		`);
		const rows = pg.executeSync(transID);
		if (rows.length == 0) {
			return response_partial("No player online data found");
		}
		return response_success(rows);
	} catch (e: any) {
		return response_error(e);
	}
}

////////////// insert

export async function createPlayersOnline(value: number)
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
	} catch (e: any) {
		return response_error(e);
	}
}

///////////////////////////// Server status
////////////// get

export async function getServerStatus(limit: number = 0, order: string = "ASC")
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT itime, value
			FROM public.server_uptime
			ORDER BY id ${order} ${limit ? "LIMIT " + limit : ""}
		`);
		const rows = pg.executeSync(transID);
		if (rows.length == 0) {
			return response_partial("No server data found");
		}
		return response_success(rows);
	} catch (e: any) {
		return response_error(e);
	}
}

////////////// insert

export async function createServerStatus(bool: boolean)
{
	const transID = utils.getTransID();

	if (bool === undefined) {
		return response_error("value undefined");
	}

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.server_uptime
			(itime, value)
			VALUES ('${time.getTimestamp()}', ${bool})
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e: any) {
		return response_error(e);
	}
}

///////////////////////////// Logtime history
////////////// get

export async function getLogtimeHistory()
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			SELECT username, logtime, itime
			FROM public.logtime_history
			ORDER BY id ASC
		`);
		const rows = pg.executeSync(transID);
		if (rows.length == 0) {
			return response_partial("No logtime history found");
		}

		let ret: Array<IplayerLogtimeHistory> = [];
		for (const row of rows) {
			let history: IplayerLogtimeHistory = {
				username: [],
				logtime: [],
				itime: row.itime,
			};
			for (const i in row.username) {
				history.username.push(row.username[i]);
				history.logtime.push(parseInt(row.logtime[i]));
			}
			ret.push(history);
		}

		return response_success(ret);
	} catch (e: any) {
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

	let username = utils.stringifyArraySQL( utils.extractJSON(ret as any[], "username") );
	let logtime = utils.stringifyArraySQL( utils.extractJSON(ret as any[], "logtime"), "\"", "" );

	try {
		pg.prepareSync(transID, `
			INSERT INTO public.logtime_history
			(username, logtime, itime)
			VALUES (ARRAY${username}, ARRAY${logtime}, NOW()::date)
		`);
		pg.executeSync(transID);
		return response_success();
	} catch (e: any) {
		return response_error(e);
	}
}

setInterval(async() => {
	if (time.getTime() !== "00:00") {
		return ;
	}

	const ret = await createLogtimeHistory();
	if (ret.state === "success") {
		logs.info("Logtime history successfully created.");
	} else if (ret.state === "partial") {
		logs.info("No Logtime data to create logtime history.");
	} else {
		logs.warning("Failed to update logtime history.");
	}
}, 60000);

// for development / debug purposes only
export function deleteTable(table: string)
{
	const transID = utils.getTransID();

	try {
		pg.prepareSync(transID, `
			DELETE FROM public.${table}
		`);
		pg.executeSync(transID);
		logs.info("Deleted " + table);
		return response_success();
	} catch (e: any) {
		logs.error("delete failed for " + table);
		return response_error(e);
	};
}
