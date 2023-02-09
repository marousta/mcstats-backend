import { ServerInfos } from 'src/types';
/**
 * Charts
 */

export interface ResponseHistoryServerUptime {
	up: number;
	down: number;
}

export interface ResponseHistoryPlayersMaxOnline {
	date: Date;
	value: number;
}

export interface HistoryPlayersLogtimes {
	date: Date;
	value: number;
}

export interface ResponseHistoryPlayersLogtimes {
	username: string;
	data: HistoryPlayersLogtimes[];
	current: number;
}

/**
 * Scrapper
 */

export interface ResponsePlayersOnline {
	online: number;
	usernames: string[];
	max_active_players: number;
}

export interface ResponseServerInfos {
	java: ServerInfos;
	bedrock: ServerInfos | null;
}

export interface ResponseServer {
	state: boolean;
	version: ResponseServerInfos;
	// since: number;
}

export interface ResponseScrapperData {
	timestamp: number;
	server: ResponseServer;
	players: ResponsePlayersOnline;
}
