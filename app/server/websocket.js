const guuid			= require('uuid')
const data			= require('./data_collector.js')
const utils			= require('./utils.js')
const config		= require('../config.js')

let webclients		= []
let client_timeout	= []
let connected_peers = 0

function client_alive_timeout(ws, uuid)
{
	client_timeout[uuid] = setTimeout(() => {
		ws.close()
	}, 12000)
}

function dispatch_error(error, code, override)
{
	for (const uuid in webclients)
	{
		webclients[uuid].ws.send(JSON.stringify({
			error: error,
			code: code,
			override: override,
		}))
	}
}

function handler(ws, req)
{
	const uuid = guuid.v4()
	webclients[uuid] = {
		ws: ws,
		ip: req.headers['x-real-ip'] ? req.headers['x-real-ip'] : "local-network"
	}
	console.log("[%s] %sconnected%s", uuid.substr(0, 10), "\x1B[32m", "\x1b[0m")
	console.log("[%s] IP: %s", uuid.substr(0, 10), webclients[uuid].ip)

	connected_peers++

	////////////////////////////

	ws.on("message", (msg) => {
		try {
			let requested = JSON.parse(msg)

			console.log("[%s] recevied : \"%s\"", uuid.substr(0, 10), msg)
			clearTimeout(client_timeout[uuid])
			switch (requested.state)
			{
				// case "test"			: TESTCHART(ws); break
				case "keep alive"	: ws.send(JSON.stringify({keepalive: 1})); break
				case "close"		: ws.close(); break
			}
			client_alive_timeout(ws, uuid)
		}
		catch (e) {
			utils.log.error(["websocket_recevied", msg])
		}
	})

	ws.on("close", (ws) => {
		console.log("[%s] %sended%s", uuid.substr(0, 10), "\x1b[31m", "\x1b[0m")
	})

	////////////////////////////

	try {
		//todo
	}
	catch (e) {
		utils.log.error(e)
		ws.send("error")
		ws.close()
	}
}

module.exports.handler = handler
module.exports.dispatch_error = dispatch_error
