import { Injectable, Logger } from '@nestjs/common';

import { ModdedDBService, VanillaDBService } from 'src/database/implemtations.service';
import { ModdedScrapperService, VanillaScrapperService } from './scrapper.service';

import { PlayersLogtime } from 'src/entities/players/logtime.entity';

import colors from 'src/utils/colors';
import * as time from 'src/utils/time';
import * as utils from 'src/utils/utils';

import {
	ResponseHistoryPlayersLogtimes,
	ResponseHistoryPlayersMaxOnline,
	ResponseHistoryServerUptime,
} from './types';

export class ChartsService {
	constructor(
		private readonly logger: Logger,
		private readonly DBService: VanillaDBService | ModdedDBService,
		private readonly scrapperService: VanillaScrapperService | ModdedScrapperService,
	) {}

	async uptime(): Promise<ResponseHistoryServerUptime[]> {
		const server_uptime = await this.DBService.get.server.uptime();

		if (!server_uptime) {
			return [
				{
					up: time.getTimestamp(),
					down: 0,
				},
			];
		}

		let uptime: ResponseHistoryServerUptime[] = [];

		for (let i = 0; i < server_uptime.length; i++) {
			const session: ResponseHistoryServerUptime = {
				up: 0,
				down: 0,
			};
			if (!i && !server_uptime[i]!.value) {
				continue;
			} else if (server_uptime[i + 1]) {
				session.up = new time.getTime(server_uptime[i]!.time).timestamp();
				session.down = new time.getTime(server_uptime[++i]!.time).timestamp();
			} else {
				session.up = new time.getTime(server_uptime[i]!.time).timestamp();
				session.down = 0;
			}
			uptime.push(session);
		}

		return uptime;
	}

	async playersMax(): Promise<ResponseHistoryPlayersMaxOnline[]> {
		const history_online = await this.DBService.get.history.online();

		if (!history_online) {
			return [];
		}

		const daily: ResponseHistoryPlayersMaxOnline[] = history_online.map((max) => {
			return {
				date: max.time,
				value: max.value,
			};
		});

		return daily;
	}

	async playersLogtimeHistory(): Promise<ResponseHistoryPlayersLogtimes[]> {
		const players_logtimes = await this.DBService.get.history.logtime();
		const users_logtime = (await this.DBService.get.player.logtime({})) as
			| PlayersLogtime[]
			| null;
		const players_sessions = this.scrapperService.getActivesSessions();

		if (!players_logtimes || !users_logtime) {
			return [];
		}

		if (!players_sessions) {
			this.logger.warn(
				`${colors.pink}[playersLogtimeHistory]${colors.yellow} Unable to get actives sessions. Current logtimes will not be up to date`,
			);
		}

		const players_logtime_mapped = await this.DBService.mapUsernames.arrayLogtimeHistory(
			players_logtimes,
		);

		const history: ResponseHistoryPlayersLogtimes[] = [];

		// from history in database
		players_logtime_mapped.forEach((logtime) => {
			logtime.usernames.forEach((username) => {
				let player: ResponseHistoryPlayersLogtimes | undefined = history.find(
					(player) => player.username === username,
				);
				if (!player) {
					player = {
						username: username,
						data: [],
						current: -1,
					};
				}

				const i = logtime.usernames.indexOf(username);
				player.data.push({
					date: logtime.time,
					value: logtime.logtimes[i]!,
				});

				if (player.current !== -1) {
					return;
				}

				const db = users_logtime.find((user) => user.username === username);
				if (db && players_sessions) {
					const session = players_sessions.find(
						(session) => session.user.username === username,
					);
					if (session) {
						player.current = utils.calcLogtime(
							new time.getTime(session.connection_time).timestamp(),
							db.logtime,
						);
					} else {
						player.current = db.logtime;
					}
				} else {
					player.current = db ? db.logtime : logtime.logtimes[i]!;
				}

				history.push(player);
			});
		});

		// sort by username asc
		history.sort((a, b) => {
			if (a.username.toLowerCase() < b.username.toLowerCase()) {
				return -1;
			}
			if (a.username.toLowerCase() > b.username.toLowerCase()) {
				return 1;
			}
			return 0;
		});

		return history;
	}
}
@Injectable()
export class VanillaChartsService extends ChartsService {
	constructor(DBService: VanillaDBService, scrapperService: VanillaScrapperService) {
		super(new Logger(VanillaChartsService.name), DBService, scrapperService);
	}
}

@Injectable()
export class ModdedChartsService extends ChartsService {
	constructor(DBService: ModdedDBService, scrapperService: ModdedScrapperService) {
		super(new Logger(ModdedChartsService.name), DBService, scrapperService);
	}
}
