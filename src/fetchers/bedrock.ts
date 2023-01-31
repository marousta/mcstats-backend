import { Logger } from '@nestjs/common';
import mc from 'minecraft-server-util';

import colors from 'src/utils/colors';

export class FetcherBedrock {
	private readonly logger = new Logger(FetcherBedrock.name);

	private readonly MC_BEDROCK_HOST: string;
	private readonly MC_BEDROCK_PORT: number;

	private BEDROCK_VERSION = '';

	constructor(MC_BEDROCK_HOST: string, MC_BEDROCK_PORT: number) {
		this.MC_BEDROCK_HOST = MC_BEDROCK_HOST;
		this.MC_BEDROCK_PORT = MC_BEDROCK_PORT;
	}

	async fetch() {
		const query = await mc
			.statusBedrock(this.MC_BEDROCK_HOST, this.MC_BEDROCK_PORT, { timeout: 3000 })
			.catch((e) => {
				if (
					!e.message.includes('received 0') && // UDP timeout ignore
					!e.message.includes('Timed out') &&
					!e.message.includes('getaddrinfo EAI_AGAIN minecraft')
				) {
					this.logger.error(`${colors.pink}[fetch]${colors.red} `, e);
				}
				return null;
			});
		if (!query) {
			return false;
		}
		const version = query.version.name;
		if (this.BEDROCK_VERSION != version) {
			this.BEDROCK_VERSION = version;
			//TODO: websocket.sendVersion(this.VANILLA_VERSION, this.BEDROCK_VERSION);
			this.logger.log('Bedrock version updated!');
		}
		return true;
	}
}
