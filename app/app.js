const fs = require('fs');
require('dotenv').config();

if (fs.existsSync(".env") === false) {
	console.log(".env file not found create it with .env.template");
	process.exit(1);
} else {
	require("./checkEnv.js");
}

const ws		= require('ws');
const websocket = require('./server/websocket.js');
const logs		= require('./server/utils/logs.js');

if (process.env.npm_package_name === undefined) {
	logs.warning("Not launched with npm.\n          > npm run start");
}

//Init discord bot log miroir
logs.discordInit();

//Create websocket bind to the webserver
const wss = new ws.Server({ port: process.env.port });

//Websocket listen for clients connections
wss.on('connection', websocket.handler);

logs.info("Server started.");
logs.info("listening port : " + process.env.port);
logs.info("Waiting for peers..");
logs.info(`scraping from executable "${process.env.execPath}"`);
logs.info(`          with parameter "${process.env.serverURL}"`);

process.on('SIGINT', () => {
	console.log();
	logs.warning("Caught interrupt signal");
	process.exit();
})
