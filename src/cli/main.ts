import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { CLIModule } from './cli.module';

import { Args } from 'src/cli/args/args';
import * as Executor from 'src/cli/exectutor';

import checkEnv from 'src/env/check';
import initDB from 'src/utils/init_db';

async function bootstrap() {
	const logger = new Logger('MainCLI');

	const args = new Args().getParsed();

	checkEnv();
	initDB();

	if (args.exec === 'help') {
		Executor.help();
		process.exit(0);
	}

	/**
	 * App initialization
	 */

	const app = await NestFactory.createApplicationContext(CLIModule, {
		logger: ['error'],
	});

	/**
	 * Execute command
	 */

	switch (args.exec) {
		case 'migrate':
			await Executor.migrateDB(app, args);
			break;
		default:
			logger.error(`This is bad #1`);
			process.exit(1);
	}

	process.exit(0);
}

bootstrap();
