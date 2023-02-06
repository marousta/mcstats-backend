import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { ModdedController, VanillaController } from 'src/app/app.controller';

import colors from 'src/utils/colors';

export default function (): Array<VanillaController | ModdedController> {
	const logger = new Logger('controllerLoader');

	const config = new ConfigService();

	const controllers: Array<any> = [];

	const MC_HOST = config.get<string>('MC_HOST');
	const MC_QUERY_PORT = config.get<string>('MC_QUERY_PORT');
	const MC_RCON_PORT = config.get<string>('MC_RCON_PORT');
	const MC_MOD_HOST = config.get<string>('MC_MOD_HOST');
	const MC_MOD_QUERY_PORT = config.get<string>('MC_MOD_QUERY_PORT');
	const MC_MOD_RCON_PORT = config.get<string>('MC_MOD_RCON_PORT');
	const MC_BEDROCK_HOST = config.get<string>('MC_BEDROCK_HOST');
	const MC_BEDROCK_PORT = config.get<string>('MC_BEDROCK_PORT');

	if ((MC_HOST && MC_QUERY_PORT && MC_RCON_PORT) || (MC_BEDROCK_HOST && MC_BEDROCK_PORT)) {
		controllers.push(VanillaController);
	}
	if (MC_MOD_HOST && MC_MOD_QUERY_PORT && MC_MOD_RCON_PORT) {
		controllers.push(ModdedController);
	}

	if (!controllers.length) {
		logger.error(`${colors.pink}[controllerLoader]${colors.red} No controller available`);
		process.exit(1);
	}

	return controllers;
}
