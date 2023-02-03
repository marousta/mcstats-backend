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

export interface ResponseServerKind {
	type: string;
	version: string;
}

export interface ResponseServer {
	state: boolean;
	kind: ResponseServerKind[];
	// since: number;
}

export interface ResponseScrapperData {
	timestamp: number;
	server: ResponseServer;
	players: ResponsePlayersOnline;
}

export interface ResponseScrapper {
	vanilla: ResponseScrapperData | null;
	modded: ResponseScrapperData | null;
}
