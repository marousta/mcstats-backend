import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';

import {
	PlayerDBMinecraftFailover,
	PlayerDBMinecraftFailure,
	PlayerDBMinecraftSuccess,
} from 'src/types';

@Injectable()
export class MojangUUID {
	private readonly logger = new Logger(MojangUUID.name);
	private readonly axios_user_agent = this.configService.get<string>('USER_AGENT');

	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
	) {}

	async get(username: string): Promise<string | null> {
		this.logger.debug(`Fetching UUID`);

		const PlayerDB:
			| PlayerDBMinecraftSuccess
			| PlayerDBMinecraftFailure
			| PlayerDBMinecraftFailover = await this.httpService
			.axiosRef({
				url: 'https://playerdb.co/api/player/minecraft/' + username,
				method: 'GET',
				headers: {
					'User-Agent': this.axios_user_agent,
					'Accept-Encoding': 'application/json',
				},
				responseType: 'json',
			})
			.then((r): PlayerDBMinecraftSuccess | PlayerDBMinecraftFailure => {
				return r.data;
			})
			.catch((e: AxiosError): PlayerDBMinecraftFailover => {
				this.logger.error(
					`Unable to get mojang uuid for ${username}: ${
						(e.response?.data as any).message
					}`,
					e,
				);
				return {
					success: false,
				};
			});

		if (!PlayerDB.success) {
			return null;
		}
		return PlayerDB.data.player.id;
	}
}
