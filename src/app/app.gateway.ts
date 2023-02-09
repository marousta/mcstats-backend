import { Logger } from '@nestjs/common';
import {
	ConnectedSocket,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	WebSocketGateway,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

import { WebsocketPlayersChange, WebsocketServerStatus, WebsocketServerVersion } from './types';

@WebSocketGateway({
	path: '/api/streaming',
	cors: true,
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
	private readonly logger = new Logger(AppGateway.name);

	private server: Server;

	constructor() {}

	afterInit(server: Server) {
		this.server = server;
		this.logger.log('Websocket is live');
	}

	async handleConnection(@ConnectedSocket() client: WebSocket) {
		this.logger.debug('CONNECTED CLIENT');
	}

	async handleDisconnect(client: WebSocket) {
		this.logger.debug('DISCONNECTED CLIENT');
	}

	dispatch(data: WebsocketServerStatus | WebsocketServerVersion | WebsocketPlayersChange) {
		this.logger.debug(`[dispatch] Dispatch ${JSON.stringify(data)}`);
		const connections = this.server.clients.size;
		let i = connections;
		for (const client of this.server.clients) {
			client.send(JSON.stringify(data), (e) => {
				i--;
			});
		}
		this.logger.debug(`[dispatch] dipatched data to ${i} of ${connections} peers`);
	}
}
