import * as guuid from 'uuid';
import { type WebSocket } from 'ws';
import { type IncomingMessage } from 'http';

import { GraphMaxPlayers, LogConnect, LogDisconnect, UptimeData, DataCollected, ErrorResponse, PartialResponse, IwebsocketData, IuptimeData, McVersion } from '$types';
import { logs } from '$utils/logs';
import * as time from '$utils/time';
import * as data from '$server/data_collector';

interface Iws {
    [name: string]: WebSocket;
}

interface Itimeout {
    [name: string]: NodeJS.Timeout;
}

let webclients: Iws = {};
let client_timeout: Itimeout = {};
let connected_peers: number = 0;

/////////////////////////////

function sendConnected(timestamp: number, players: Array<string>)
{
	let message: LogConnect = {
		type: "log",
		action: "connect",
		timestamp: timestamp,
		affected: players,
	};
	dispatch(message);
}

function sendDisconnected(timestamp: number, players: Array<string>)
{
	let message: LogDisconnect = {
		type: "log",
		action: "disconnect",
		timestamp: timestamp,
		affected: players,
	};
	dispatch(message);
}

export function sendMaxPlayers(maxPlayersOnline: number)
{
	let message: GraphMaxPlayers = {
		type: "graph",
		affected: "maxPlayers",
		new_data: [{
			data: maxPlayersOnline,
			label: new time.getDate(time.getTimestamp()).full()
		}],
	};
	dispatch(message);
}

export function sendUptime(data: IuptimeData)
{
	let message: UptimeData = {
		type: "uptime",
		state: data.state,
		timestamp: data.timestamp,
	};
	dispatch(message);
}

export function sendVersion(java: string | null, bedrock: string | null)
{
	let message: McVersion = {
		type: "version",
		java: java,
		bedrock: bedrock,
	};
	dispatch(message);
}

let playersConnected: Array<string> = [];

async function collect()
{
	const ret: DataCollected | ErrorResponse | PartialResponse = await data.dataCollector();

	logs.lastQuery();

	if (ret.state === "error" || ret.state == "partial") {
		return ;
	}

	let diff_connected: Array<string> = ret.connected.filter(x => !playersConnected.includes(x));
	let diff_disconnected: Array<string> = playersConnected.filter(x => !ret.connected.includes(x));

	if (diff_connected.length != 0) {
		sendConnected(ret.timestamp, diff_connected);
	}
	if (diff_disconnected.length != 0) {
		sendDisconnected(ret.timestamp, diff_disconnected);
	}
	playersConnected = ret.connected;
}

setInterval(collect, 3000);

/////////////////////////////

async function initData(uuid: string)
{
	let ret = await data.initWebsocketData();
	if (ret.state === "error") {
		logs.error("failed to get init data");
		return;
	}

	let init: IwebsocketData = {
		...ret.init,
	};
	webclients[uuid].send(JSON.stringify(init));
	// logs.info("dispatched " + JSON.stringify(init));

	if (ret.playersConnected && ret.playersConnected.length != 0) {
		const message: LogConnect = {
			type: "log",
			action: "connect",
			timestamp: time.getTimestamp(),
			affected: ret.playersConnected,
		};
		webclients[uuid].send(JSON.stringify(message));
		// logs.info("dispatched " + JSON.stringify(message));
	}
}

/////////////////////////////

function client_alive_timeout(ws: WebSocket, uuid: string)
{
	client_timeout[uuid] = setTimeout(() => {
		ws.close();
	}, 60000);
}

// function dispatch_error(error, code, override)
// {
// 	for (const uuid in webclients)
// 	{
// 		webclients[uuid].send(JSON.stringify({
// 			error: error,
// 			code: code,
// 			override: override,
// 		}));
// 	}
// }

function dispatch(message: any)
{
	const msg: string = JSON.stringify(message);
	// let dispatched: boolean = false;

	for (const uuid in webclients) {
		webclients[uuid].send(msg);
		// dispatched = true;
	}
	// if (dispatched) {
	// 	logs.info(msg);
	// }
}

function logConnectedPeers()
{
	if (connected_peers > 1) {
		logs.info(connected_peers + " actives websockets");
	} else {
		logs.info(connected_peers + " active websocket");
	}
}


export function handler(ws: WebSocket, req: IncomingMessage)
{
	const uuid: string = guuid.v4();
	webclients[uuid] = ws;
	console.log("[%s] %sconnected%s", uuid.substring(0, 10), "\x1B[32m", "\x1b[0m");
	console.log("[%s] IP: %s", uuid.substring(0, 10), req.headers['x-real-ip'] ? req.headers['x-real-ip'] : "local-network");

	connected_peers++;
	logConnectedPeers();

	////////////////////////////

	ws.on("message", (msg) => {
		clearTimeout(client_timeout[uuid]);
		client_alive_timeout(ws, uuid);
	});

	ws.on("close", () => {
		console.log("[%s] %sended%s", uuid.substring(0, 10), "\x1b[31m", "\x1b[0m");
		connected_peers--;
		delete webclients[uuid];
		logConnectedPeers();
	});

	////////////////////////////

	try {
		initData(uuid);
	}
	catch (e: any) {
		logs.error(e);
		ws.close();
	}
}
