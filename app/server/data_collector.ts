import * as mc from 'minecraft-server-util';
import * as rconClient from 'rcon-client';

import { colors, DataCollected, FullQueryTrueResponse, BedrockTrueResponse, defaultFalseResponse, defaultTrueResponse, IwebsocketData, ErrorResponse, SuccessResponse, PartialResponse, IsessionUptime, IplayersHistory, MaxPlayersOnlineResponse, InitDataReponse } from '$types';
import { env } from '$env';
import * as utils from '$utils/utils';
import { logs } from '$utils/logs';
import * as time from '$utils/time';
import * as response from '$utils/response';
import * as websocket from '$server/websocket';
import * as pg from '$server/sql';

/////////////////////////////

async function fetchBedrockInfos()
{
	let query: BedrockTrueResponse | defaultFalseResponse = await mc.statusBedrock(env.minecraftBedrockHost, env.minecraftBedrockPort, { timeout: 3000 })
						.then(result => {
							return { status: true, ...result};
						})
						.catch(error => {
							if (!error.message.includes("received 0") // UDP timeout ignore
							&& !error.message.includes("Timed out")
							&& !error.message.includes("getaddrinfo EAI_AGAIN minecraft")) {
								logs.mc("fetchBedrockInfos: " + error.message);
							}
							return { status: false };
						});
	if (query.status) {
		const version = query.version.name;
		if (mcBedrockVersion != version) {
			mcBedrockVersion = version;
			websocket.sendVersion(mcVersion, mcBedrockVersion);
			logs.mc("Bedrock version updated!");
		}
	}
}

async function fetchJavaInfos()
{
	let query: FullQueryTrueResponse | defaultFalseResponse = await mc.queryFull(env.minecraftHost, env.minecraftQueryPort, { timeout: 3000 })
						.then(result => {
							return { status: true, ...result};
						})
						.catch(error => {
							if (!error.message.includes("received 0") // UDP timeout ignore
							&& !error.message.includes("Timed out")
							&& !error.message.includes("getaddrinfo EAI_AGAIN minecraft")) {
								logs.mc("fetchJavaInfos: " + error.message);
							}
							return { status: false };
						});

	if (query.status) {
		if (mcVersion != query.version) {
			mcVersion = query.version;
			websocket.sendVersion(mcVersion, mcBedrockVersion);
			logs.mc("Java version updated!");
		}
	}
}

let rcon: rconClient.Rcon | null = null;

async function fetchPlayers(): Promise<defaultTrueResponse | defaultFalseResponse>
{
	try {
		if (rcon === null) {
			rcon = await rconClient.Rcon.connect({
				host: env.minecraftHost,
				port: env.minecraftRconPort,
				password: env.minecraftRconPassword
			});
		}
	} catch(e: any) {
		if (!e.message.includes("ECONNREFUSED")
		&& !e.message.includes("getaddrinfo EAI_AGAIN minecraft")
		&& !e.message.includes("connect EHOSTUNREACH")) {
			logs.error(e.message);
		}
	}
	try {
		if (rcon === null) {
			return { status: false };
		}
		let response: string = await rcon.send("list");
		// [There are 2 of a max of 60 players online]: [player1, anotherplayer]
		// [player1], [anotherplayer] || ['']
		let players = response.split(": ")[1];
		if (players.includes("of a max of 60 players online")
		|| players.includes("Started tick profiling")
		|| players.includes("Stopped tick profiling")) {
			logs.RCON("hot fixed");
			return fetchPlayers();
		}

		let ret: Array<string> = players.split(", ");
		ret = ret.filter(x => x !== "");
		return {
			status: true,
			value: ret
		};
	} catch (e: any) {
		if (e.message === "Not connected") { // server is down
			rcon = null;
		} else if (e.message.includes("includes")) { // unknown error
			logs.warning(e.message);
		} else if (!e.message.includes("Timeout for packet id") // server is down ignore
				&& !e.message.includes("EHOSTUNREACH")) {
			logs.error(e.message); // unhandled error
		}
	}
	return { status: false };
}

///////////////////////////// init

let playersConnected: Array<string> | null = null;
let playersOnline: number = 0;
let maxPlayersOnline: number = 0;
let serverOnline: boolean = false;
let serverRetry: number = 0;

let mcVersion: string | null = null;
let mcBedrockVersion: string | null = null;
fetchJavaInfos();
fetchBedrockInfos();

async function updateServerStatus(status: boolean): Promise<SuccessResponse | ErrorResponse>
{
	// get previous server status
	let ret = response.sql(await pg.getServerStatus(1, "DESC"), "Unable to get server status");
	if (ret === "error") {
		return { state: "error", message: "" };
	} else if (ret === "partial") { // no database entry create one based on current server status
		ret = response.sql(await pg.createServerStatus(status), "Unable to create default server status");
		if (ret === "error") {
			return { state: "error", message: "" };
		}
		websocket.sendUptime({
			state: status,
			timestamp: time.getTimestamp(),
		});
		return { state: "success" };
	}

	// server database already up to date, nothing to do
	if (ret[0].value === status) {
		return { state: "success" };
	}

	// server status differ from database, updating ..
	ret = response.sql(await pg.createServerStatus(status), "Unable to create server status");
	if (ret === "error") {
		return { state: "error", message: "" };
	}
	websocket.sendUptime({
		state: status,
		timestamp: time.getTimestamp(),
	});
	return { state: "success" };
}

async function initPlayerConnected()
{
	const ret = response.sql(await pg.getPlayersSessions(), "Unable to init playersConnected");
	if (ret === "error") {
		process.exit(1);
	}
	else if (ret === "partial") {
		return [];
	} else {
		return utils.extractJSON(ret as Array<string>, "username") as Array<string>;
	}
}

///////////////////////////// dataCollect

async function generateReturn(): Promise<DataCollected | ErrorResponse>
{
	const since = response.sql(await pg.getServerStatus(1), "Unable to get server status");
	if (since === "error") {
		return { state: "error", message: "" };
	}

	return {
		state: "success",
		timestamp: time.getTimestamp(),
		serverStatus: {
			online: serverOnline,
			since: since[0].itime,
		},
		connected: playersConnected || [],
		playersOnline: playersOnline,
		maxPlayersOnline: maxPlayersOnline,
	};
}

export async function dataCollector(): Promise<DataCollected | ErrorResponse | PartialResponse>
{
	if (playersConnected === null) {
		playersConnected = await initPlayerConnected();
		if (playersConnected) {
			for (const player of playersConnected) {
				logs.info(`${player} is ${colors.green}connected${colors.end} based on last data.`);
			}
		}
	}

	const data = await fetchPlayers();

	const player_names = data.status ? data.value as Array<string> : [];

	// check server status and create new status if it was previously offline
	if (data.status && !serverOnline) {
		serverRetry = 0;
		serverOnline = true;

		logs.info(`Server is ${colors.green}up${colors.end}!`);

		let ret = response.sql(await updateServerStatus(true), "Unable to create server status"); //todo
		if (ret === "error") {
			return { state: "error", message: "" };
		}
	}

	// retrying request n times
	if (!data.status && serverOnline && serverRetry != env.queryRetry)
	{
		serverRetry++;
		logs.warning(`Server not responding`);
		return { state: "partial", message: "" };
	}
	// server offline closing sessions and updating logtimes
	if (!data.status && serverRetry == env.queryRetry) {
		serverRetry = 0;
		serverOnline = false;

		logs.info(`Server is ${colors.red}down${colors.end}!`);

		let ret = response.ft(await updateServerStatus(false), "Unable to create server status"); //todo
		if (ret === "error") {
			return { state: "error", message: "" };
		}

		ret = response.ft(await endSessions(player_names), "Unable to update logtime and close sessions");
		if (ret === "error") {
			return { state: "error", message: "" };
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
	if (!data.status && !serverOnline) {
		return { state: "partial", message: "" };
	}

	serverRetry = 0;

	if (serverOnline && player_names.length != playersConnected.length) {
		let ret = await newSessions(player_names);
		if (ret.state === "error") {
			return { state: "error", message: "" };
		}

		ret = await endSessions(player_names);
		if (ret.state === "error") {
			return { state: "error", message: "" };
		}
		playersConnected = player_names;
	}

	// playersOnline++
	playersOnline = player_names.length;
	if (maxPlayersOnline < playersOnline) {
		maxPlayersOnline = playersOnline;
	}

	// dispatch new / removed users
	return await generateReturn();
}

///////////////////////////// Sessions

async function newSessions(player_names: Array<string>): Promise<SuccessResponse | ErrorResponse | PartialResponse>
{
	if (!playersConnected) {
		return {
			state: "error",
			message: "playersConnected is null",
		};
	}

	if (player_names === undefined) {
		player_names = [];
	}

	if (player_names.length < playersConnected.length) {
		return { state: "partial", message: "" };
	}

	let diff = player_names.filter(x => playersConnected ? !playersConnected.includes(x) : x);
	for (const player of diff) {
		const ret = response.sql(await pg.createSession(player), "Unable to create session for " + player);
		if (ret === "error") {
			return { state: "error", message: "" };
		}
		logs.info(`${player} is ${colors.green}connected${colors.end}!`);
	}

	return { state: "success" };
}

function calcLogtime(session: number, current: number): number
{
	const timestamp = time.getTimestamp();
	const logtime = timestamp - session + current;
	return logtime;
}

async function createLogtime(username: string): Promise<SuccessResponse | ErrorResponse>
{
	const session = response.sql(await pg.getPlayerSession(username), "Unable to get session for " + username) as any;
	if (session === "error") {
		return { state: "error", message: "" };
	}

	let createLogtime = false;
	let logtime: number = 0;
	const userLogtime = response.sql(await pg.getLogtime(username), "Unable to get logtime for " + username) as any;
	if (userLogtime === "error") {
		return { state: "error", message: "" };
	} else if (userLogtime === "empty") {
		createLogtime = true;
	}

	if (userLogtime !== "empty") {
		logtime = userLogtime[0].logtime;
	}
	const newLogtime: number = calcLogtime(session.connection_time, logtime);

	// No records for current user .. creating one
	if (createLogtime) {
		let ret = response.sql(await pg.createLogtime(username, newLogtime), "Unable to create logtime for " + username);
		if (ret === "error") {
			return { state: "error", message: "" };
		}
	} else {
	// updating existing records
		let ret = response.sql(await pg.updateLogtime(username, newLogtime), "Unable to update logtime for " + username);
		if (ret === "error") {
			return { state: "error", message: "" };
		}
	}

	return { state: "success" };
}

async function endSessions(player_names: Array<string>): Promise<SuccessResponse | ErrorResponse | PartialResponse>
{
	if (!playersConnected) {
		return {
			state: "error",
			message: "playersConnected is null",
		};
	}

	if (player_names.length > playersConnected.length) {
		return { state: "partial", message: "" };
	}

	let diff = playersConnected.filter(x => !player_names.includes(x));
	for (const player of diff) {
		let ret = response.ft(await createLogtime(player), "Unable to compute logtime for " + player);
		if (ret === "error") {
			return { state: "error", message: "" };
		}

		ret = response.ft(await pg.removeSession(player), "Unable to end session for " + player);
		if (ret === "error") {
			return { state: "error", message: "" };
		}

		logs.info(`${player} is ${colors.red}disconnected${colors.end}!`);
	}

	playersConnected = player_names.filter(x => playersConnected ? !playersConnected.includes(x) : x);

	return { state: "success" };
}

/////////////////////////////

async function updatePlayersOnline(): Promise<MaxPlayersOnlineResponse | ErrorResponse>
{
	logs.info(`current: [ ${playersOnline} / 60 ] max: ${maxPlayersOnline}`);
	const ret = response.sql(await pg.createPlayersOnline(maxPlayersOnline), "Unable to store player value");
	if (ret === "error") {
		return { state: "error", message: "" };
	}
	let tmp_maxPlayersOnline = maxPlayersOnline;
	maxPlayersOnline = 0;
	return {
		state: "success",
		value: tmp_maxPlayersOnline,
	};
}

export async function initWebsocketData(): Promise<InitDataReponse | ErrorResponse>
{
	const	playersSessions			= response.sql(await pg.getPlayersSessions()),
			serverStatus			= response.sql(await pg.getServerStatus()),
			playersLogitmesHistory	= response.sql(await pg.getLogtimeHistory()),
			playersLogtimesCurrent	= response.sql(await pg.getLogtimes()),
			playersOnlineHistory	= response.sql(await pg.getPlayersOnline());

	if (utils.oneOfEachAs("error", playersSessions, serverStatus, playersLogitmesHistory, playersLogtimesCurrent, playersOnlineHistory)) {
		return { state: "error", message: "" };
	}

	let ret: IwebsocketData = {
		type: "init",
		version: {
			java: mcVersion,
			bedrock: mcBedrockVersion,
		},
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
			let session: IsessionUptime = {
				up: 0,
				down: 0,
			}
			if (!i && !serverStatus[i].value) {
				continue;
			} else if (serverStatus[i + 1]) {
				session.up = parseInt(serverStatus[i].itime);
				session.down = parseInt(serverStatus[++i].itime);
			} else {
				session.up = parseInt(serverStatus[i].itime);
				session.down = 0;
			}
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

			let player: IplayersHistory = {
				username: username,
				data: [],
				todayLogtime: 0,
			};

			for (const x in playersLogitmesHistory as any[]) {
				const logtime = playersLogitmesHistory[x].logtime[i];
				player.data.push({
					date: new time.getDate(playersLogitmesHistory[x].itime).lite(),
					logtime: logtime ? parseInt(logtime) : 0,
				});
			};
			const todayLogtime = () => {
				const logtimeHistory = player.data[player.data.length - 1];
				const find = (playersSessions as any[]).filter(s => s.username === username);
				if (find.length == 1) {
					return calcLogtime(find[0].connection_time, logtimeHistory.logtime);
				}
				return logtimeHistory.logtime;
			}
			player.todayLogtime = todayLogtime();
			ret.players.push(player);
		}
	}
	// from today new values not in history
	if (playersLogtimesCurrent !== "empty") {
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
				const find = (playersSessions as any[]).filter(s => s.username === username);
				if (find.length == 1) {
					return calcLogtime(find[0].connection_time, logtime.logtime);
				}
				return logtime.logtime;
			}
			player.todayLogtime = todayLogtime();
			ret.players.push(player);
		}
	}
	// form currently connected player not in history
	if (playersSessions !== "empty") {
		for (const session of playersSessions) {
			const username = session.username;
			const duplicate = ret.players.filter(x => x.username === username);
			if (duplicate.length != 0) {
				continue;
			}
			let player = {
				username: username,
				data: [],
				todayLogtime: time.getTimestamp() - session.connection_time,
			};
			ret.players.push(player);
		}
	}

	// daily: [
	// 	{ date, maxPlayers },
    // ]
	if (playersOnlineHistory !== "empty") {
		for (const data of playersOnlineHistory) {
			let daily = {
				date: data.itime,
				maxPlayers: data.value,
			};
			ret.daily.push(daily);
		}
	}

	return {
		state: "success",
		init: ret,
		playersConnected: playersSessions.length != 0 ? utils.extractJSON(playersSessions as any[], "username") as string[] : [],
	};
}

setInterval(async() => {
	fetchJavaInfos();
	fetchBedrockInfos();

	const t = time.getTime().split(":")
	const hours = parseInt(t[0]);
	const mins = parseInt(t[1]);
	if (hours % 6 || (hours % 6 === 0 && mins % 60)) {
		return ;
	}

	const ret = await updatePlayersOnline();
	if (ret.state !== "error") {
		logs.info("Players online history successfully created.");
		websocket.sendMaxPlayers(ret.value);
	}
}, 60000);
