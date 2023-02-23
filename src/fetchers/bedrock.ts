import { Logger } from '@nestjs/common';
import { statusBedrock } from 'minecraft-server-util';

import colors from 'src/utils/colors';
import skipError from 'src/utils/skip_error';

import { ServerInfos } from 'src/types';

export class FetcherBedrock {
	private readonly logger = new Logger(FetcherBedrock.name);

	private readonly MC_BEDROCK_HOST: string;
	private readonly MC_BEDROCK_PORT: number;

	private version: string;
	private capacity: number;
	private motd: string;

	constructor(MC_BEDROCK_HOST: string, MC_BEDROCK_PORT: number) {
		this.MC_BEDROCK_HOST = MC_BEDROCK_HOST;
		this.MC_BEDROCK_PORT = MC_BEDROCK_PORT;
	}

	async fetch(): Promise<ServerInfos | null> {
		const query = await statusBedrock(this.MC_BEDROCK_HOST, this.MC_BEDROCK_PORT, {
			timeout: 3000,
		}).catch((e) => {
			if (skipError(e.message)) {
				this.logger.error(`${colors.pink}[fetch]${colors.red} `, e);
			}
			return null;
		});

		if (!query) {
			return null;
		}

		if (this.version != query.version.name) {
			this.version = query.version.name;
			this.logger.log('Bedrock version updated!');
		}
		if (this.capacity != query.players.max) {
			this.capacity = query.players.max;
			this.logger.log('Bedrock capacity updated!');
		}
		if (this.motd !== query.motd.clean) {
			this.motd = query.motd.clean;
			this.logger.log('Bedrock motd updated!');
		}

		return { version: this.version, capacity: this.capacity, motd: this.motd };
	}
}
