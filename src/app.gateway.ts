import { Logger } from '@nestjs/common';
import {
	ConnectedSocket,
	OnGatewayConnection,
	OnGatewayInit,
	WebSocketGateway,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayInit {
	private readonly logger = new Logger(AppGateway.name);

	async handleConnection(@ConnectedSocket() client: WebSocket) {}

	afterInit(server: Server) {
		this.logger.log('Websocket is live');
	}
}
