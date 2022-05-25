const ws		= require('ws')
const websocket = require('./server/websocket.js')
const utils		= require('./server/utils.js')

//Create websocket bind to the webserver
const wss = new ws.Server({ port: 3001 });

//Websocket listen for clients connections
wss.on('connection', websocket.handler)

console.log("Server started")
console.log("listening port : 3001")
console.log("Waiting for peers..")

process.on('SIGINT', () => {
	console.log()
	utils.log.warning("Caught interrupt signal")
	process.exit()
})
