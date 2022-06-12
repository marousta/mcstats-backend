import * as fs from 'fs';
import { Ienv } from '$types';
import { logs } from '$utils/logs';

let missing = false;

function check(variable: string)
{
	const value: string | undefined = process.env[variable];

	if (!value || value === "") {
		logs.error(`env "${variable}" is missing`, false);
		missing = true;
	}
}

function parseString(variable: string): string
{
	const value: string | undefined = process.env[variable];

	if (!value || value === "") {
		return "";
	} else {
		return value;
	}
}

function parseNumber(variable: string): number
{
	const value: string | undefined = process.env[variable];

	if (!value || value === "") {
		return -1; // never happend
	} else {
		return parseInt(value);
	}
}

check("websocketPort");
check("minecraftHost");
check("minecraftQueryPort");
check("queryRetry");
check("minecraftRconPort");
check("minecraftRconPassword");
check("minecraftBedrockHost");
check("minecraftBedrockPort");
check("postgresHost");
check("postgresPort");
check("postgresUser");
check("postgresPassword");
check("postgresDatabase");

if (missing) {
	if (!fs.existsSync(".env")) {
		console.log(".env file not found create it with .env.template");
	}
	process.exit(1);
}

export const env: Ienv = {
		/* websocket */
		websocketPort:			parseNumber("websocketPort"),

		/* scraper */
		minecraftHost:			parseString("minecraftHost"),
		minecraftQueryPort:		parseNumber("minecraftQueryPort"),
		queryRetry:				parseNumber("queryRetry"),
		minecraftRconPort:		parseNumber("minecraftRconPort"),
		minecraftRconPassword:	parseString("minecraftRconPassword"),
		minecraftBedrockHost:	parseString("minecraftBedrockHost"),
		minecraftBedrockPort:	parseNumber("minecraftBedrockPort"),

		/* postgres */
		postgresHost:		parseString("postgresHost"),
		postgresPort:		parseNumber("postgresPort"),
		postgresDatabase:	parseString("postgresUser"),
		postgresUser:		parseString("postgresPassword"),
		postgresPassword:	parseString("postgresDatabase"),
		postgresOptions:	parseString("postgresOptions"),

		/* discord */
		discordToken:		parseString("discordToken"),
		discordChannel:		parseString("discordChannel"),
		discordUser:		parseString("discordUser"),
}
