import { Logger } from '@nestjs/common';
import mc from 'minecraft-server-util';

import colors from 'src/utils/colors';

export class FetcherJava {
	private readonly logger = new Logger(FetcherJava.name);

	private readonly MC_HOST: string;
	private readonly MC_QUERY_PORT: number;

	private VANILLA_VERSION = '';

	constructor(MC_HOST: string, MC_QUERY_PORT: number) {
		this.MC_HOST = MC_HOST;
		this.MC_QUERY_PORT = MC_QUERY_PORT;
	}

	async fetch() {
		const query = await mc
			.queryFull(this.MC_HOST, this.MC_QUERY_PORT, { timeout: 3000 })
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
		if (this.VANILLA_VERSION != query.version) {
			this.VANILLA_VERSION = query.version;
			//TODO: websocket.sendVersion(this.VANILLA_VERSION, this.BEDROCK_VERSION);
			this.logger.log('Java version updated!');
		}
		return true;
	}
}
