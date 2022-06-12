require('dotenv').config();

import { env } from '$env';
import { logs } from '$utils/logs';

if (process.env.npm_package_name === undefined) {
	logs.warning("Not launched with npm.\n\n\t> npm run start\n");
}

import * as fs from "fs";
import * as rconClient from 'rcon-client';

import * as utils from '$utils/utils';
import * as response from '$utils/response';
import type { defaultFalseResponse, defaultTrueResponse } from '$types';

function RESETDATABASE()
{
	const pg = require('$server/sql');

	let i = 0;
	let ticker = setInterval(() => {
		logs.warning("RESETDATABASE is ENABLED");
		if (++i === 7) {
			clearInterval(ticker);
		}
	}, 1000);
	setTimeout(async() => {
		logs.info("Reset in progress..");

		let ret = [
			response.sql(await pg.deleteTable("logtime_history")),
			response.sql(await pg.deleteTable("players_logtime")),
			response.sql(await pg.deleteTable("players_online")),
			response.sql(await pg.deleteTable("players_sessions")),
			response.sql(await pg.deleteTable("server_uptime")),
		];
		if (utils.oneOfEachAs("error", ret) === false) {
			logs.info("Reset complete!");
			process.exit(0);
		}
	}, 7500);
}

async function tailFile(file: string)
{
	if (!fs.existsSync(file)) {
		logs.error("last_query.log not found", false);
		process.exit(1);
	}
	let last: string | null = null;
	setInterval(() => {
		let content = fs.readFileSync(file).toString();
		if (content != last) {
			process.stdout.write(content + "\r");
		}
		last = content;
	}, 1000);
}

let rcon: rconClient.Rcon | null = null;

async function fetchRCON(cmd: string): Promise<defaultTrueResponse | defaultFalseResponse>
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
		if (e.message.includes("ECONNREFUSED") === false) {
			logs.error(e.message);
		}
	}
	try {
		if (rcon === null) {
			return { status: false };
		}
		let response = await rcon.send(cmd);
		return {
			status: true,
			value: response
		};
	} catch (e: any) {
		if (e.message === "Not connected") {
			rcon = null;
		} else {
			logs.error(e.message);
		}
	}
	return { status: false };
}

let state: string | null = null;

async function tailTPS()
{
	let response = await fetchRCON("debug start");
	setTimeout(async() => {
		if (response.status === false) {
			return;
		}

		response = await fetchRCON("debug stop");
		if (response.status === false) {
			return;
		}

		const value = parseFloat((response.value as string).split(" (")[1]);
		process.stdout.write("  " + value + " tps\r");

		setTimeout(() => {
			tailTPS();
		}, 3000);
	}, 10000);
}

switch (process.argv[2])
{
	case "resetdatabase" :	RESETDATABASE();
							break;
	case "querytime" :		tailFile("last_query.log");
							break;
	case "tps" :			state = "tps";
							tailTPS();
							break;
	default :	logs.error("command not found", false);
				process.exit(1);
}

process.on('SIGINT', async() => {
	if (state === "tps") {
		await fetchRCON("debug stop");
	}
	process.exit();
});
