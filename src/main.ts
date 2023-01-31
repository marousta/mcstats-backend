import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';

import { AppModule } from 'src/app/app.module';
import { DBService } from './services/db.service';

import checkEnv from './env/check';

async function bootstrap() {
	checkEnv();

	const app = await NestFactory.create(AppModule);

	app.use(helmet());

	app.enableCors();
	app.setGlobalPrefix('api');

	app.useWebSocketAdapter(new WsAdapter(app));

	await app.listen(3000);

	const logger = new Logger('Main');

	const config = app.get(ConfigService);
	const WEBSOCKET_PORT = config.get<string>('WEBSOCKET_PORT');
	const MC_HOST = config.get<string>('MC_HOST');
	const MC_QUERY_PORT = config.get<string>('MC_QUERY_PORT');
	const MC_RCON_PORT = config.get<string>('MC_RCON_PORT');
	const MC_MOD_HOST = config.get<string>('MC_MOD_HOST');
	const MC_MOD_QUERY_PORT = config.get<string>('MC_MOD_QUERY_PORT');
	const MC_MOD_RCON_PORT = config.get<string>('MC_MOD_RCON_PORT');
	const MC_BEDROCK_HOST = config.get<string>('MC_BEDROCK_HOST');
	const MC_BEDROCK_PORT = config.get<string>('MC_BEDROCK_PORT');
	const QUERY_RETRY = config.get<string>('QUERY_RETRY');

	logger.log(`Queries retry set to ${QUERY_RETRY}`);
	logger.log(`Websocket listening on ${WEBSOCKET_PORT}`);
	logger.log(`Requesting data from`);
	if (MC_HOST && MC_QUERY_PORT && MC_RCON_PORT) {
		logger.log(`	- Vanilla: ${MC_HOST} Q:${MC_QUERY_PORT} R:${MC_RCON_PORT}`);
	}
	if (MC_BEDROCK_HOST && MC_BEDROCK_PORT) {
		logger.log(`	- Geyser:  ${MC_BEDROCK_HOST} Q:${MC_BEDROCK_PORT}`);
	}
	if (MC_MOD_HOST && MC_MOD_QUERY_PORT && MC_MOD_RCON_PORT) {
		logger.log(`	- Modded:  ${MC_MOD_HOST} Q:${MC_MOD_QUERY_PORT} R:${MC_MOD_RCON_PORT}`);
	}

	const service = app.get(DBService);

	// const user = await service.create.user('player1');
	// const user = await service.get.user('player1');
	// console.log(user);
	// if (!user) {
	// 	console.log('Failed');
	// 	return;
	// }

	// const new_session = await service.create.player.session(user);
	// console.log(new_session);

	// let get_session = await service.get.player.session();
	// console.log(get_session);
	// get_session = await service.get.player.session(user);
	// console.log(get_session);

	// const delete_session = await service.delete.session(user);
	// console.log(delete_session);

	// const new_online = await service.create.player.online(10);
	// console.log(new_online);

	// let get_online = await service.get.player.online();
	// console.log(get_online);

	// const new_uptime = await service.create.server.uptime(true);
	// console.log(new_uptime);

	// let get_uptime = await service.get.server.uptime();
	// console.log(get_uptime);

	// console.log(await app.get(AppService).getMojangUUID('player1'));
}
bootstrap();
