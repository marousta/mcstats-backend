import * as fs from 'fs';

import { env } from '$env';
import { colors } from '$types';

import * as time from '$utils/time';
import * as utils from '$utils/utils';
import * as discord	from '$utils/discord';

async function logFatal(text: string, debug = true)
{
	let message = "";
	if (debug) {
		message = utils.getFunctionAndLine();
	}
	console.log("[%s] %s[FATAL]%s %s", time.getTime("log"), colors.red, colors.end, message);
	console.log();
	console.log("\t" + text);
	if (text[text.length - 1] !== "\n") {
		console.log();
	}
	await discord.send("[FATAL] " + message + "\n" + text);
	process.exit(1);
}

async function logError(text: string, debug = true)
{
	const message = utils.getFunctionAndLine();
	if (debug) {
		console.log("[%s] %s[ERROR]%s %s", time.getTime("log"), colors.red, colors.end, message);
		console.log();
		console.log("\t" + text);
		if (text[text.length - 1] !== "\n") {
			console.log();
		}
	} else {
		console.log("[%s] %s[ERROR]%s %s", time.getTime("log"), colors.red, colors.end, text);
	}
	await discord.send("[ERROR] " + message + "\n" + text);
}

function logWarning(text: string)
{
	console.log("[%s] %s[WARNING]%s %s", time.getTime("log"), colors.yellow, colors.end, text);
}

function logInfo(text: string)
{
	console.log("[%s] %s[INFO]%s %s", time.getTime("log"), colors.blue, colors.end, text);
}

function logSql(text: string)
{
	console.log("[%s] %s[SQL]%s %s", time.getTime("log"), colors.pink, colors.end, text);
}

function logDiscord(text: string)
{
	console.log("[%s] %s[Discord]%s %s", time.getTime("log"), colors.pink, colors.end, text);
}

function logMc(text: string)
{
	console.log("[%s] %s[MC Util]%s %s", time.getTime("log"), colors.green, colors.end, text);
}

function logRCON(text: string)
{
	console.log("[%s] %s[RCON]%s %s", time.getTime("log"), colors.green, colors.end, text);
}

function lastQuery()
{
	const content = "last query: " + time.getTime("log");
	fs.writeFileSync("last_query.log", content);
}

export const logs = {
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

export async function discordInit()
{
	if (env.discordToken === undefined || env.discordToken === "") {
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
