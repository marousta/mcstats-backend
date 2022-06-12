import { FullQueryResponse } from 'minecraft-server-util';

export const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
	yellow: "\x1b[33m",
	pink: "\x1b[35m",
	end: "\x1b[0m",
};

export interface Ienv {
	/* websocket */
	websocketPort: number;

	/* scraper */
	minecraftHost:			string;
	minecraftQueryPort:		number;
	queryRetry:				number;
	minecraftRconPort:		number;
	minecraftRconPassword:	string;
	minecraftBedrockHost:	string;
	minecraftBedrockPort:	number;

	/* postgres */
	postgresHost:		string;
	postgresPort:		number;
	postgresDatabase:	string;
	postgresUser:		string;
	postgresPassword:	string;
	postgresOptions:	string;

	/* discord */
	discordToken?:		string;
	discordChannel?:	string;
	discordUser?:		string;
};

export interface Idate {
	y:  number;
	m:  number;
	d:  number;
	hh: number;
	mm: number;
	ss: number;
};

export type defaultTrueResponse = {
	status: true;
	value: string | string[];
};

export type defaultFalseResponse = {
	status: false;
};

export type SuccessResponse = {
	state: "success";
	content?: Array<any>;
};

export type PartialResponse = {
	state: "partial"
	message: string;
};

export type ErrorResponse = {
	state: "error"
	message: string;
};

export type MaxPlayersOnlineResponse = {
	state: "success";
	value: number;
};

export type GraphMaxPlayersData = {
	data: number;
	label: string;
};

export type GraphMaxPlayers = {
	type: "graph";
	affected: "maxPlayers";
	new_data: Array<GraphMaxPlayersData>;
};

export type UptimeData = {
	type: "uptime";
	state: boolean;
	timestamp: number;
};

export type LogConnect = {
	type: "log";
	action: "connect";
	timestamp: number;
	affected: Array<string>;
};

export type LogDisconnect = {
	type: "log";
	action: "disconnect";
	timestamp: number;
	affected: Array<string>;
};

export type DataCollected = {
	state: "success",
	timestamp: number,
	serverStatus: {
		online: boolean,
		since: number,
	},
	connected: Array<string>,
	playersOnline: number,
	maxPlayersOnline: number,
};

export interface FullQueryTrueResponse extends FullQueryResponse {
	status: boolean;
};

export interface Isession {
	username: string;
	connection_time: number;
};

export interface IplayerLogtime {
	username: string;
	logtime: number;
};

export interface Iuptime {
	itime: number;
	value: boolean;
};

export interface IsessionUptime {
	up: number;
	down: number;
};

export interface IplayerOnlineHistory {
	itime: number;
	value: boolean;
};

export interface IplayerLogtimeHistory {
	username: Array<string>;
	logtime: Array<number>;
	itime: number;
};

export interface IplayersHistoryData {
	date: string;
	logtime: number;
};

export interface IplayersHistory {
	username: string;
	data: Array<IplayersHistoryData>;
	todayLogtime: number;
};

export interface IdailyData {
	date: number;
	maxPlayers: number;
};

export type IwebsocketData = {
	type: "init",
	version: IMcVersion;
	uptime: {
		sessions: Array<IsessionUptime>
	},
	players: Array<IplayersHistory>,
	daily: Array<IdailyData>;
};

export type InitDataReponse = {
	state: "success";
	init: IwebsocketData;
	playersConnected: string[];
};

export interface IuptimeData {
	state: boolean;
	timestamp: number;
};

export interface IMcVersion {
	java: string | null;
	bedrock: string | null;
};

export type McVersion = {
	type: "version";
	java: string | null;
	bedrock: string | null;
};
