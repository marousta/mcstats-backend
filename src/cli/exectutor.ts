import { INestApplicationContext, Logger } from '@nestjs/common';

import { ModdedDBService, VanillaDBService } from 'src/database/implemtations.service';

import { Migrate } from 'src/cli/migrate/migrate';

import { ServerKind } from 'src/types';
import { ArgsMigrate, ArgsSave, SaveTarget } from 'src/cli/args/types';
import { MojangUUID } from '../services/mojangUUID.service';
import {
	ModdedScrapperService,
	VanillaScrapperService,
	ScrapperService,
} from '../services/scrapper.service';
import { DBService } from '../database/db.service';

// prettier-ignore
export function help() {
console.log(
`
NAMES
	help    - print this message
	migrate - migrate database
	save    - save history of target in database

SYNOPSIS
	help
	migrate [--dry-run] KIND FILE_PATH
	save KIND TARGET

OPTIONAL
	--dry-run - Execute the migration without saving it. Print the result when complete.

KIND
	Server kind (${Object.values(ServerKind).join(", ")})

FILE_PATH
	Path to file can be absolute or relative to the root project folder (where the README.md is)

TARGET
	logtimes - save logtimes and print saved entity
`);
}

export async function migrateDB(app: INestApplicationContext, args: ArgsMigrate) {
	const logger = new Logger('Executor.migrateDB');

	let service: any;
	switch (args.kind) {
		case ServerKind.Vanilla:
			service = VanillaDBService;
			break;
		case ServerKind.Modded:
			service = ModdedDBService;
			break;
		default:
			logger.error('This is bad #2');
			process.exit(1);
	}

	const db: DBService = app.get(service);
	const mojangUUID = app.get(MojangUUID);
	let migration = new Migrate(db, mojangUUID, args.dryrun).init(args.filename);

	if (args.dryrun) {
		migration = await migration.parse();
		console.log(migration.getParsed());
	} else {
		migration = await migration.parse();
		await migration.save();
	}
}

export async function saveDB(app: INestApplicationContext, args: ArgsSave) {
	const logger = new Logger('Executor.saveDB');

	let scrap_service: any;
	let db_service: any;
	switch (args.kind) {
		case ServerKind.Vanilla:
			scrap_service = VanillaScrapperService;
			db_service = VanillaDBService;
			break;
		case ServerKind.Modded:
			scrap_service = ModdedScrapperService;
			db_service = ModdedDBService;
			break;
		default:
			logger.error('This is bad #2');
			process.exit(1);
	}

	const scrapper: ScrapperService = app.get(scrap_service);
	const db: DBService = app.get(db_service);
	await scrapper.scrap();

	switch (args.target) {
		case SaveTarget.Logtime:
			const save = await scrapper.save.history.logtime();
			if (!save) {
				logger.error('Unable to execute command, function save.history.logtime() failed');
				process.exit(1);
			}

			const result = await db.get.history.logtime();
			if (!result) {
				logger.error('Unable to get result entity, uncertain state');
				process.exit(1);
			}
			console.log(result);
			break;
		default:
			logger.error('This is bad #3');
			process.exit(1);
	}
}
