import { ServerKind } from 'src/types';
import { ResponseServerInfos } from 'src/services/types';

/**
 * Enums
 */

export enum WebsocketNamespace {
	Server = 'server',
	Players = 'players',
}

export enum WebsocketServerEvent {
	Status = 'status',
	Infos = 'infos',
}

export enum WebsocketPlayersEvent {
	Change = 'change',
}

/**
 * Generic
 */

export interface WebsocketData {
	namespace: WebsocketNamespace;
}

/**
 * Server
 */

export interface WebsocketServer extends WebsocketData {
	namespace: WebsocketNamespace.Server;
	event: WebsocketServerEvent;
}

export interface WebsocketServerStatus extends WebsocketServer {
	event: WebsocketServerEvent.Status;
	server: {
		kind: ServerKind;
		status: boolean;
	};
}

export interface WebsocketServerVersion extends WebsocketServer {
	event: WebsocketServerEvent.Infos;
	server: {
		kind: ServerKind;
		version: ResponseServerInfos;
	};
}

/**
 * Players
 */

export interface WebsocketPlayers extends WebsocketData {
	namespace: WebsocketNamespace.Players;
	event: WebsocketPlayersEvent;
}

export interface WebsocketPlayersChange extends WebsocketPlayers {
	event: WebsocketPlayersEvent.Change;
	server: {
		kind: ServerKind;
	};
	players: ResponsePlayersCurrentlyOnline[];
}

export interface ResponsePlayersCurrentlyOnline {
	uuid: string;
	username: string;
}
