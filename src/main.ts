import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import { spawnSync } from 'child_process';

import { AppModule } from 'src/app/app.module';

import checkEnv from './env/check';
import initDB from './utils/init_db';

async function bootstrap() {
	const logger = new Logger('Main');

	checkEnv();
	initDB();

	/**
	 * App initialization
	 */

	const app = await NestFactory.create(AppModule, {
		logger: process.env['PRODUCTION'] ? (['log', 'error', 'warn'] as any) : undefined,
	});

	app.use(helmet());

	app.enableCors();
	app.setGlobalPrefix('api');

	app.useWebSocketAdapter(new WsAdapter(app));

	await app.listen(3000);

	/**
	 * Verbose
	 */

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
		logger.log(`	- Vanilla: H:${MC_HOST} Q:${MC_QUERY_PORT} R:${MC_RCON_PORT}`);
	}
	if (MC_BEDROCK_HOST && MC_BEDROCK_PORT) {
		logger.log(`	- Geyser:  H:${MC_BEDROCK_HOST} Q:${MC_BEDROCK_PORT}`);
	}
	if (MC_MOD_HOST && MC_MOD_QUERY_PORT && MC_MOD_RCON_PORT) {
		logger.log(`	- Modded:  H:${MC_MOD_HOST} Q:${MC_MOD_QUERY_PORT} R:${MC_MOD_RCON_PORT}`);
	}
}
bootstrap();
