import { Logger } from '@nestjs/common';
import * as rconClient from 'rcon-client';

import colors from 'src/utils/colors';
import sleep from 'src/utils/sleep';

export class FetcherPlayers {
	private readonly logger = new Logger(FetcherPlayers.name);

	private readonly MC_HOST: string;
	private readonly MC_RCON_PORT: number;
	private readonly MC_RCON_PASSWORD: string;

	private RCON: rconClient.Rcon | null = null;

	constructor(MC_HOST: string, MC_RCON_PORT: number, MC_RCON_PASSWORD: string) {
		this.MC_HOST = MC_HOST;
		this.MC_RCON_PORT = MC_RCON_PORT;
		this.MC_RCON_PASSWORD = MC_RCON_PASSWORD;
	}

	private async rconConnect() {
		try {
			if (this.RCON === null) {
				this.RCON = await rconClient.Rcon.connect({
					host: this.MC_HOST,
					port: this.MC_RCON_PORT,
					password: this.MC_RCON_PASSWORD,
				});
			}
		} catch (e: any) {
			if (
				!e.message.includes('ECONNREFUSED') &&
				!e.message.includes('getaddrinfo EAI_AGAIN minecraft') &&
				!e.message.includes('connect EHOSTUNREACH')
			) {
				this.logger.error(`${colors.pink}[rconConnect]${colors.red} `, e);
			}
		}
	}

	async fetch(): Promise<string[] | null> {
		this.rconConnect();

		if (this.RCON === null) {
			return null;
		}

		let response: string | null = null;

		try {
			response = await this.RCON.send('list');
		} catch (e: any) {
			if (
				e.message === 'Not connected' ||
				(!e.message.includes('Timeout for packet id') &&
					!e.message.includes('EHOSTUNREACH'))
			) {
				/**
				 * server is down
				 */
				this.RCON = null;
			} else if (e.message.includes('includes')) {
				/**
				 * unknown error
				 */
				this.logger.warn(`${colors.pink}[fetchPlayers]${colors.yellow} `, e);
			} else {
				/**
				 * unhandled error
				 */
				this.logger.error(`${colors.pink}[fetchPlayers]${colors.red} `, e);
			}
			return null;
		}

		/**
		 * Players online response:
		 * [There are 2 of a max of 60 players online]: [Player1, Player2]
		 * => [Player1], [Player2]
		 * No players online response:
		 * [There are 0 of a max of 60 players online]: []
		 * => [""]
		 */
		const players = response.split(': ')[1] ?? '';
		if (
			players.includes('of a max of 60 players online') ||
			players.includes('Started tick profiling') ||
			players.includes('Stopped tick profiling')
		) {
			this.logger.error(`${colors.pink}[fetchPlayers]${colors.green} hot fixed`);
			await sleep(500);
			return this.fetch();
		}

		/**
		 * Split
		 * [Player1, Player2] => [Player1], [Player2]
		 */
		let parsed_players = players.split(', ');
		parsed_players = parsed_players.filter((x) => x);

		return parsed_players;
	}
}
