import { Logger } from '@nestjs/common';
import { queryFull } from 'minecraft-server-util';

import colors from 'src/utils/colors';
import skipError from 'src/utils/skip_error';

import { ServerKind } from 'src/types';
import { ServerInfos } from 'src/types';

export class FetcherJava {
	private readonly logger = new Logger(FetcherJava.name);

	private readonly MC_HOST: string;
	private readonly MC_QUERY_PORT: number;
	private readonly kind: ServerKind;

	private version: string;
	private capacity: number;

	constructor(kind: ServerKind, MC_HOST: string, MC_QUERY_PORT: number) {
		this.kind = kind;
		this.MC_HOST = MC_HOST;
		this.MC_QUERY_PORT = MC_QUERY_PORT;
	}

	async fetch(): Promise<ServerInfos | null> {
		const query = await queryFull(this.MC_HOST, this.MC_QUERY_PORT, { timeout: 3000 }).catch(
			(e) => {
				this.logger.debug(`[fetch] `, e);

				if (skipError(e.message)) {
					this.logger.error(`${colors.pink}[fetch]${colors.red} `, e);
				}
				return null;
			},
		);

		if (!query) {
			return null;
		}
		if (this.version !== query.version) {
			this.version = query.version;
			this.logger.log(
				`Java ${
					this.kind === ServerKind.Vanilla
						? 'Vanilla'
						: this.kind === ServerKind.Modded
						? 'Modded'
						: '???'
				} version updated!`,
			);
		}
		if (this.capacity !== query.players.max) {
			this.capacity = query.players.max;
			this.logger.log(
				`Java ${
					this.kind === ServerKind.Vanilla
						? 'Vanilla'
						: this.kind === ServerKind.Modded
						? 'Modded'
						: '???'
				} capacity updated!`,
			);
		}
		return { version: this.version, capacity: this.capacity };
	}
}
