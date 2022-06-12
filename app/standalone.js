require('dotenv').config();

require("./checkEnv.js");

const logs = require('./server/utils/logs.js');

if (process.env.npm_package_name === undefined) {
	logs.warning("Not launched with npm.\n          > npm run start");
}

const fs		= require("fs");
const utils		= require('./server/utils/utils.js');
const response	= require('./server/utils/response.js');
const rconClient= require("rcon-client").Rcon;

function RESETDATABASE()
{
	const pg = require('./server/sql.js');

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

async function tailFile(file)
{
	if (!fs.existsSync(file)) {
		logs.error("last_query.log not found", false);
		process.exit(1);
	}
	let last = null;
	setInterval(() => {
		let content = fs.readFileSync(file).toString();
		if (content != last) {
			process.stdout.write(content + "\r");
		}
		last = content;
	}, 1000);
}

let rcon = null;

async function fetchRCON(cmd)
{
	try {
		if (rcon === null) {
			rcon = await rconClient.connect({
				host: process.env.minecraftHost,
				port: process.env.minecraftRconPort,
				password: process.env.minecraftRconPassword
			});
		}
	} catch(e) {
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
	} catch (e) {
		if (e.message === "Not connected") {
			rcon = null;
		} else {
			logs.error(e.message);
		}
	}
	return { status: false };
}

let state = null;

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

		value = parseFloat(response.value.split(" (")[1]);
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
