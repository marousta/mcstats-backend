const ws		= require('ws');
const websocket = require('./server/websocket.js');
const utils		= require('./server/utils/utils.js');
const logs		= require('./server/utils/logs.js');
const port		= require('./config.js').port;

//Create websocket bind to the webserver
const wss = new ws.Server({ port: port });

//Websocket listen for clients connections
wss.on('connection', websocket.handler);

logs.info("Server started");
logs.info("listening port : " + port);
logs.info("Waiting for peers..");

process.on('SIGINT', () => {
	console.log();
	logs.warning("Caught interrupt signal");
	process.exit();
})
