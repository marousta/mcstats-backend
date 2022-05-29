const ws		= require('ws');
const websocket = require('./server/websocket.js');
const utils		= require('./server/utils/utils.js');
const logs		= require('./server/utils/logs.js');
const config		= require('./config.js');

//Create websocket bind to the webserver
const wss = new ws.Server({ port: config.port });

//Websocket listen for clients connections
wss.on('connection', websocket.handler);

logs.info("Server started.");
logs.info("listening port : " + config.port);
logs.info("Waiting for peers..");
logs.info(`scraping from executable "${config.execPath}"`);
logs.info(`          with parameter "${config.serverURL}"`);

process.on('SIGINT', () => {
	console.log();
	logs.warning("Caught interrupt signal");
	process.exit();
})
