import { Logger } from '@nestjs/common';
import { spawnSync } from 'child_process';

/**
 * Awful workaround
 * TypeORM doesn't support database and schena creation
 * and I don't want to rely on another package
 */
export default function () {
	const logger = new Logger('InitDB');

	const result = spawnSync('/bin/bash', ['-c', 'bash $(find . -type f -name "init_db.sh")']);
	const stdout = result.stdout.toString();
	const out = stdout.split('OK').join('').trim();

	if (out) {
		logger.error('Failed to initialize database:');
		const errors = result.stderr.toString().split('\n');
		errors.forEach((e) => {
			logger.error(`${e}`);
		});
		process.exit(1);
	}
}
