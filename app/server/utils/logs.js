const colors	= require("./colors.js");
const time		= require("./time.js");
const utils		= require("./utils.js");
const config	= require("../../config.js");

let discordSend = () => {};
if (config.discord.token !== undefined && config.discord.token !== "") {
	logDiscord("Login in..");
	discordSend = require("./discord.js");
}

async function logFatal(text)
{
	const message = utils.getFunctionAndLine();
	console.log("%s[FATAL]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, message);
	console.log("                            " + text);
	await discordSend("[FATAL] " + message + "\n" + text);
	process.exit(1);
}

async function logError(text, debug = true)
{
	const message = utils.getFunctionAndLine();
	if (debug) {
		console.log("%s[ERROR]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, message);
		console.log("                            " + text);
	} else {
		console.log("%s[ERROR]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, text);
	}
	await discordSend("[ERROR] " + message + "\n" + text);
}

function logWarning(text)
{
	console.log("%s[WARNING]%s %s", colors.yellow, colors.end, text);
}

function logInfo(text)
{
	console.log("%s[INFO]%s %s", colors.blue, colors.end, text);
}

function logSql(text)
{
	console.log("%s[SQL]%s %s", colors.pink, colors.end, text);
}

function logDiscord(text)
{
	console.log("%s[Discord]%s %s", colors.pink, colors.end, text);
}

module.exports = {
	fatal: logFatal,
	error: logError,
	warning: logWarning,
	info: logInfo,
	sql: logSql,
	discord: logDiscord,
};
