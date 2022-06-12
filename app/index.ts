require('dotenv').config();

import * as ws from 'ws';
import { env } from '$env';
import { logs, discordInit } from '$utils/logs';
import * as websocket from '$server/websocket';

if (process.env.npm_package_name === undefined) {
	logs.warning("Not launched with npm.\n\n\t> npm run start\n");
}

//Init discord bot log miroir
discordInit();

//Create websocket bind to the webserver
const wss = new ws.Server({ port: env.websocketPort });

//Websocket listen for clients connections
wss.on('connection', websocket.handler);

logs.info("Server started.");
logs.info("listening port : " + env.websocketPort);
logs.info("Waiting for peers..");
logs.info(`requesting data from "${env.minecraftHost}:${env.minecraftQueryPort}"`);

process.on('SIGINT', () => {
	console.log();
	logs.warning("Caught interrupt signal");
	process.exit();
})
