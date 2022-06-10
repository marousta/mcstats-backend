const fs		= require("fs");
const colors	= require("./colors.js");
const time		= require("./time.js");
const utils		= require("./utils.js");
const discord	= require("./discord.js");

async function logFatal(text)
{
	const message = utils.getFunctionAndLine();
	console.log("[%s] %s[FATAL]%s %s", time.getTime("log"), colors.red, colors.end, message);
	console.log("                            " + text);
	await discord.send("[FATAL] " + message + "\n" + text);
	process.exit(1);
}

async function logError(text, debug = true)
{
	const message = utils.getFunctionAndLine();
	if (debug) {
		console.log("[%s] %s[ERROR]%s %s", time.getTime("log"), colors.red, colors.end, message);
		console.log("                            " + text);
	} else {
		console.log("[%s] %s[ERROR]%s %s", time.getTime("log"), colors.red, colors.end, text);
	}
	await discord.send("[ERROR] " + message + "\n" + text);
}

function logWarning(text)
{
	console.log("[%s] %s[WARNING]%s %s", time.getTime("log"), colors.yellow, colors.end, text);
}

function logInfo(text)
{
	console.log("[%s] %s[INFO]%s %s", time.getTime("log"), colors.blue, colors.end, text);
}

function logSql(text)
{
	console.log("[%s] %s[SQL]%s %s", time.getTime("log"), colors.pink, colors.end, text);
}

function logDiscord(text)
{
	console.log("[%s] %s[Discord]%s %s", time.getTime("log"), colors.pink, colors.end, text);
}

function logMc(text)
{
	console.log("[%s] %s[MC Util]%s %s", time.getTime("log"), colors.green, colors.end, text);
}

function logRCON(text)
{
	console.log("[%s] %s[RCON]%s %s", time.getTime("log"), colors.green, colors.end, text);
}

function lastQuery()
{
	const content = "last query: " + time.getTime("log");
	fs.writeFileSync("last_query.log", content);
}

module.exports = {
	fatal: logFatal,
	error: logError,
	warning: logWarning,
	info: logInfo,
	sql: logSql,
	discord: logDiscord,
	mc: logMc,
	RCON: logRCON,
	lastQuery: lastQuery,
};

module.exports.discordInit = async() => {
	if (process.env.discordToken === undefined || process.env.discordToken === "") {
		logDiscord("Disabled");
		return ;
	}

	logDiscord("Login in..");
	const init = await discord.init();
	if (init.state === "error") {
		logFatal(init.message);
	}
	logDiscord("Logged");
	const pingUser = await discord.setPingUser();
	if (pingUser.state === "error") {
		logFatal(pingUser.message);
	}
	const channel = await discord.setChannel();
	if (channel.state === "error") {
		logFatal(channel.message);
	}
	const test = await discord.test();
	if (test.state === "error") {
		logFatal(test.message);
	}
	logDiscord("Ready");
}
