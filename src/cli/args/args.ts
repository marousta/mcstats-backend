import { Logger } from '@nestjs/common';
import { existsSync } from 'fs';

import { ServerKind } from 'src/types';
import { ArgsHelp, ArgsMigrate, ArgsSave, SaveTarget } from 'src/cli/args/types';

export class Args {
	private readonly logger = new Logger('ArgumentsParser');

	private parsed: ArgsHelp | ArgsMigrate | ArgsSave;

	constructor() {
		if (!process.argv[2]) {
			this.logger.error('No arguments');
			process.exit(1);
		}

		const exec = process.argv[2];

		// migrate
		let dryrun: boolean = false;
		let kind: ServerKind;
		let filename: string;

		switch (exec) {
			case 'help':
				this.parsed = {
					exec: 'help',
				};
				break;

			case 'migrate':
				if (process.argv.length - 2 < 3) {
					this.logger.error('Missing arguments');
					process.exit(1);
				}

				if (process.argv[3]!.includes('--dry-run')) {
					dryrun = true;
					kind = this.getServerKind(process.argv[4]!);
					filename = this.getFilename(process.argv[5]!);
				} else {
					kind = this.getServerKind(process.argv[3]!);
					filename = this.getFilename(process.argv[4]!);
				}

				this.parsed = {
					exec,
					dryrun,
					kind,
					filename,
				};
				break;

			case 'save':
				if (process.argv.length - 2 !== 3) {
					this.logger.error('Missing arguments');
					process.exit(1);
				}

				this.parsed = {
					exec: 'save',
					kind: this.getServerKind(process.argv[3]!),
					target: this.getTarget(process.argv[4]!),
				};
				break;

			default:
				this.logger.error(`Unknow argument: ${exec}`);
				process.exit(1);
		}
	}

	getParsed() {
		return this.parsed;
	}

	private getServerKind(arg: string): ServerKind {
		const check = Object.values(ServerKind)
			.filter((v) => arg === v)
			.filter((x) => x);
		if (!check.length) {
			this.logger.error(`Unknow server: ${arg}`);
			process.exit(1);
		}
		return arg as ServerKind;
	}

	private getFilename(arg: string): string {
		if (!existsSync(arg)) {
			this.logger.error(`File not found: ${arg}`);
			process.exit(1);
		}
		return arg;
	}

	private getTarget(arg: string): SaveTarget {
		const check = Object.values(SaveTarget)
			.filter((v) => arg === v)
			.filter((x) => x);
		if (!check.length) {
			this.logger.error(`Unknow target: ${arg}`);
			process.exit(1);
		}
		return arg as SaveTarget;
	}
}
