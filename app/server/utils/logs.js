const colors	= require("./colors.js");
const time		= require("./time.js");
const utils		= require("./utils.js");
const discord	= require("./discord.js");

async function logFatal(text)
{
	const message = utils.getFunctionAndLine();
	console.log("%s[FATAL]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, message);
	console.log("                            " + text);
	await discord.send("[FATAL] " + message + "\n" + text);
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
	await discord.send("[ERROR] " + message + "\n" + text);
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
