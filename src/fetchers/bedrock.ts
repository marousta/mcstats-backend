import { Logger } from '@nestjs/common';
import { statusBedrock } from 'minecraft-server-util';

import colors from 'src/utils/colors';
import skipError from 'src/utils/skip_error';

import { ResponseServerKind } from 'src/services/types';

export class FetcherBedrock {
	private readonly logger = new Logger(FetcherBedrock.name);

	private readonly MC_BEDROCK_HOST: string;
	private readonly MC_BEDROCK_PORT: number;

	private version: string;

	constructor(MC_BEDROCK_HOST: string, MC_BEDROCK_PORT: number) {
		this.MC_BEDROCK_HOST = MC_BEDROCK_HOST;
		this.MC_BEDROCK_PORT = MC_BEDROCK_PORT;
	}

	async fetch(): Promise<ResponseServerKind | null> {
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
		const version = query.version.name;
		if (this.version != version) {
			this.version = version;
			//TODO: websocket.sendVersion(this.VANILLA_VERSION, this.BEDROCK_VERSION);
			this.logger.log('Bedrock version updated!');
		}
		return {
			type: 'bedrock',
			version: this.version,
		};
	}
}
