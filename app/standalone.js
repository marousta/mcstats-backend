require('dotenv').config();

require("./checkEnv.js");

const logs = require('./server/utils/logs.js');

if (process.env.npm_package_name === undefined) {
	logs.warning("Not launched with npm.\n          > npm run start");
}

const utils		= require('./server/utils/utils.js');
const response	= require('./server/utils/response.js');

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

switch (process.argv[2])
{
	case "resetdatabase" :	RESETDATABASE();
							break;
	default :	logs.error("command not found", false);
				process.exit(1);
}
