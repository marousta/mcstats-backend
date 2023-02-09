import { INestApplicationContext, Logger } from '@nestjs/common';

import { ModdedDBService, VanillaDBService } from 'src/database/implemtations.service';

import { Migrate } from 'src/cli/migrate/migrate';

import { ServerKind } from 'src/types';
import { ArgsMigrate } from 'src/cli/args/types';
import { MojangUUID } from '../services/mojangUUID.service';

// prettier-ignore
export function help() {
console.log(
`
NAMES
	help - print this message
	migrate - migrate database

SYNOPSIS
	help
	migrate [--dry-run] KIND FILE_PATH

OPTIONAL
	--dry-run - Execute the migration without saving it. Print the result when complete.

KIND
	Server kind (${Object.values(ServerKind).join(", ")})
FILE_PATH
	Path to file can be absolute or relative to the root project folder (where the README.md is)
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

	const db = app.get(service);
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
