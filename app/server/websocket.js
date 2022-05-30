const guuid			= require('uuid');
const data			= require('./data_collector.js');
const logs			= require('./utils/logs.js');

let webclients		= [];
let client_timeout	= [];
let connected_peers = 0;

/////////////////////////////

function sendConnected(timestamp, players)
{
	let message = {
		type: "log",
		action: "connect",
		timestamp: timestamp,
		affected: [],
	}
	for (const player of players) {
		message.affected.push(player);
	}
	dispatch(message);
}

function sendDisconnected(timestamp, players)
{
	let message = {
		type: "log",
		action: "disconnect",
		timestamp: timestamp,
		affected: [],
	}
	for (const player of players) {
		message.affected.push(player);
	}
	dispatch(message);
}

let serverStatus = null;

function sendUptime(data)
{
	let message = {
		type: "graph",
		affected: "uptime",
		data: [{timestamp: data.timestamp, value: data.serverStatus.online}]
	}
	dispatch(message);
}

let playersConnected = [];

async function collect()
{
	const ret = await data.dataCollector();
	if (ret.state === "error" || ret.state == "partial") {
		return ;
	}

	let diff_connected = ret.connected.filter(x => !playersConnected.includes(x));
	let diff_disconnected = playersConnected.filter(x => !ret.connected.includes(x));

	if (diff_connected.length !== 0) {
		sendConnected(data.timestamp, diff_connected);
	}
	if (diff_disconnected.length !== 0) {
		sendDisconnected(data.timestamp, diff_disconnected);
	}
	playersConnected = ret.connected;

	if (serverStatus === null) {
		serverStatus = ret.serverStatus;
	}
	if (serverStatus.online !== ret.serverStatus.online) {
		sendUptime(ret)
	}
}

setInterval(collect, 3000);

/////////////////////////////

async function initData(uuid)
{
	let ret = await data.initWebsocketData();
	if (ret.state === "error") {
		logs.error(["websocket_initData", "failed to get init data"]);
		return;
	}

	let message = {
		type: "init",
		...ret.init,
	};
	webclients[uuid].ws.send(JSON.stringify(message));
	// logs.info("dispatched " + JSON.stringify(message));

	if (ret.playersConnected.length !== 0) {
		message = {
			type: "log",
			action: "connect",
			affected: ret.playersConnected,
		};
		webclients[uuid].ws.send(JSON.stringify(message));
		// logs.info("dispatched " + JSON.stringify(message));
	}
}

/////////////////////////////

function client_alive_timeout(ws, uuid)
{
	client_timeout[uuid] = setTimeout(() => {
		ws.close();
	}, 12000);
}

// function dispatch_error(error, code, override)
// {
// 	for (const uuid in webclients)
// 	{
// 		webclients[uuid].ws.send(JSON.stringify({
// 			error: error,
// 			code: code,
// 			override: override,
// 		}));
// 	}
// }

function dispatch(message)
{
	for (const uuid in webclients) {
		webclients[uuid].ws.send(JSON.stringify(message));
	}
	if (webclients.length !== 0) {
		logs.info(["dispatched", JSON.stringify(message)]);
	}
}

function handler(ws, req)
{
	const uuid = guuid.v4();
	webclients[uuid] = {
		ws: ws,
		ip: req.headers['x-real-ip'] ? req.headers['x-real-ip'] : "local-network",
	};
	console.log("[%s] %sconnected%s", uuid.substr(0, 10), "\x1B[32m", "\x1b[0m");
	console.log("[%s] IP: %s", uuid.substr(0, 10), webclients[uuid].ip);

	connected_peers++;

	////////////////////////////

	ws.on("message", (msg) => {
		try {
			let requested = JSON.parse(msg);

			console.log("[%s] recevied : \"%s\"", uuid.substr(0, 10), msg);
			clearTimeout(client_timeout[uuid]);
			switch (requested.state)
			{
				// case "test"			: TESTCHART(ws); break;
				case "keep alive"	: ws.send(JSON.stringify({keepalive: 1})); break;
				case "close"		: ws.close(); break;
			}
			client_alive_timeout(ws, uuid);
		}
		catch (e) {
			logs.error(["websocket_recevied", msg]);
		}
	})

	ws.on("close", (ws) => {
		// clearInterval(inster);
		console.log("[%s] %sended%s", uuid.substr(0, 10), "\x1b[31m", "\x1b[0m");
	})

	////////////////////////////

	// const players = ["Bunlight","RiisiKulho","ez4w","_Alki","Kyoukus","TikiTikiTomate69","shovel","Sohpie","Relixto","heartsfordanny","sushhi_","Giovanka","Drikonsete","zauve","mineblox667","rhxxn","chapadokk","Daantay","imbiew","Locia","DonutEsser","gras3369","Giovanka","Neejie","Giovanka","Yuids","Demon_08ITA","ChunkyPanda3000","Spritedrx","Arychu", "Vclx","Vasply","aweya","1Hwok","H1ghLucy","D6G","Shhort","miculona","smallpawz","Kssqlf","Koha","feersz","VUUW","Kqiserr","nnex","pixelhorizon1","_BMeCTe_","Tsoht","laaurin_","CyberTux0","lesblian","Womec","1Hwek","bluby","xhinqueLM","ohVelo_","Rydenz","nosotras","vuave","awnxi","Zswy","starchuii","Neivyy","xXFokusiakXx","kicry","Straight","Forgetting","SID_PLAYZONE","Sohpie","Mcblue2080XD","AnKoyunCuk","HazelovS","Hibiikii","natclie","_UvU","Sohpie","LeleBosss","_UvU","VencislavVulka","Un_Der_Bar","EgirlWise","Tenboudai","—","GrabbeadoPorDepp","roobwy","Casus2","vuave","Misunderstanding","Sohpie","lluumii"];
	// let tab = [];
	// let max = 30;
	// let inster = setInterval(() => {
	// 	const rand1 = players[Math.floor(Math.random() * 100) % (players.length - 1)];
	// 	ws.send(JSON.stringify({
	// 		type: "log",
	// 		action: "connect",
	// 		affected: [rand1]
	// 	}));

	// 	tab.push(rand1);
	// 	if (tab.length === 30) {
	// 		clearInterval(inster);
	// 	}
	// }, 200);

	// setTimeout(() => {
	// 	let i = 0;
	// 	inster = setInterval(() => {
	// 		ws.send(JSON.stringify({
	// 			type: "log",
	// 			action: "disconnect",
	// 			affected: [tab[i]]
	// 		}));

	// 		i++;
	// 		if (i === 30) {
	// 			clearInterval(inster);
	// 		}
	// 	}, 200);
	// }, 6500);

	try {
		initData(uuid);
	}
	catch (e) {
		logs.error(e);
		ws.send("error");
		ws.close();
	}
}

module.exports.handler = handler;
// module.exports.dispatch_error = dispatch_error;
