const colors	= require("./colors.js");
const time		= require("./time.js");
const utils		= require("./utils.js");

function logFatal(text)
{
	const message = utils.getFunctionAndLine();
	console.log("%s[FATAL]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, message);
	console.log("                            " + text);
	process.exit(1);
}

function logError(text, debug = true)
{
	if (debug) {
		const message = utils.getFunctionAndLine();
		console.log("%s[ERROR]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, message);
		console.log("                            " + text);
	} else {
		console.log("%s[ERROR]%s %s%s%s", colors.red, colors.end, colors.yellow, time.getTime("log"), colors.end, text);
	}
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

module.exports = {
	fatal: logFatal,
	error: logError,
	warning: logWarning,
	info: logInfo,
	sql: logSql,
}
