import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';

import {
	HistoryPlayersLogtime,
	HistoryPlayersLogtimeMapped,
} from '../entities/history/history_players_logtime.entity';
import { HistoryPlayersOnline } from '../entities/history/history_players_online.entity';
import { PlayersLogtime } from '../entities/players/players_logtime.entity';
import { PlayersSessions } from '../entities/players/players_sessions.entity';
import { ServerUptime } from '../entities/server_uptime.entity';
import { ConfigService } from '@nestjs/config';

import {
	PlayerDBMinecraftFailover,
	PlayerDBMinecraftFailure,
	PlayerDBMinecraftSuccess,
} from '../types';
import colors from 'src/utils/colors';

@Injectable()
export class DBService {
	private readonly logger = new Logger(DBService.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
		@InjectRepository(HistoryPlayersLogtime)
		private readonly historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline)
		private readonly historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime)
		private readonly playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions)
		private readonly playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime)
		private readonly serverUptimeRepo: Repository<ServerUptime>,
	) {}

	public readonly get = {
		history: {
			online: async (): Promise<HistoryPlayersOnline[] | null> => {
				this.logger.debug(
					`${colors.pink}[get.history.online]${colors.green} Getting online players history`,
				);

				return this.historyPlayersOnlineRepo
					.createQueryBuilder()
					.select()
					.getMany()
					.catch((e) => {
						this.logger.error(`Unable to get online players`, e);
						return null;
					});
			},
			logtime: async (): Promise<HistoryPlayersLogtime[] | null> => {
				this.logger.debug(
					`${colors.pink}[get.history.logtime]${colors.green} Getting players logtime history`,
				);

				return this.historyPlayersLogtimeRepo
					.createQueryBuilder()
					.select()
					.getMany()
					.catch((e) => {
						this.logger.error(`Unable to get players logtime history`, e);
						return null;
					});
			},
		},
		player: {
			session: async (
				user: PlayersLogtime | null = null,
			): Promise<PlayersSessions[] | null> => {
				if (user) {
					this.logger.debug(
						`${colors.pink}[get.player.session]${colors.green} Getting session for ${user.username} (${user.uuid})`,
					);
				} else {
					this.logger.debug(
						`${colors.pink}[get.player.session]${colors.green} Getting sessions`,
					);
				}

				return this.playersSessionsRepo
					.createQueryBuilder('sessions')
					.select()
					.leftJoin('sessions.user', 'user')
					.where(user ? { user } : {})
					.getMany()
					.catch((e) => {
						if (user) {
							this.logger.error(
								`Unable to get player session${
									user ? ` for ${user.username} (${user.uuid})` : ''
								}`,
								e,
							);
						} else {
							this.logger.error(`Unable to get players sessions`, e);
						}
						return null;
					});
			},
			logtime: async (where: Object): Promise<PlayersLogtime | PlayersLogtime[] | null> => {
				this.logger.debug(
					`${colors.pink}[get.player.user]${
						colors.green
					} Getting logtime where ${JSON.stringify(where)}`,
				);

				if (!Object.keys(where).length) {
					return this.playersLogtimeRepo
						.createQueryBuilder()
						.select()
						.getMany()
						.catch((e) => {
							this.logger.error(`Unable to get players logtimes`, e);
							return null;
						});
				} else {
					return this.playersLogtimeRepo
						.createQueryBuilder()
						.select()
						.where(where)
						.getOne()
						.catch((e) => {
							this.logger.error(
								`Unable to get player logtime where ${JSON.stringify(where)}`,
								e,
							);
							return null;
						});
				}
			},
		},
		server: {
			uptime: async (): Promise<ServerUptime[] | null> => {
				this.logger.debug(
					`${colors.pink}[get.server.uptime]${colors.green} Getting server uptime`,
				);

				return this.serverUptimeRepo
					.createQueryBuilder()
					.select()
					.getMany()
					.catch((e) => {
						this.logger.error(`Unable to get server uptime`, e);
						return null;
					});
			},
		},
		user: async (username: string): Promise<PlayersLogtime | null> => {
			this.logger.debug(
				`${colors.pink}[get.user]${colors.green} Getting user for ${username}`,
			);

			return this.create.user(username);
		},
	};

	public readonly create = {
		history: {
			online: async (value: number): Promise<HistoryPlayersOnline | null> => {
				const time = new Date();

				this.logger.debug(
					`${colors.pink}[create.history.online]${colors.green} Creating create online players history for ${time}`,
				);

				const entity = this.historyPlayersOnlineRepo.create({
					time,
					value,
				});
				return this.historyPlayersOnlineRepo.save(entity).catch((e) => {
					this.logger.error(`Unable to create online players history`, e);
					return null;
				});
			},
			logtime: async (): Promise<HistoryPlayersLogtime | null> => {
				const time = new Date();

				this.logger.debug(
					`${colors.pink}[create.history.logtime]${colors.green} Creating create players logtime history for ${time}`,
				);

				const current_logtimes = (await this.get.player.logtime({})) as PlayersLogtime[];
				if (!current_logtimes) {
					return null;
				}

				let uuids: string[] = [];
				let logtimes: number[] = [];
				current_logtimes.map((logtime: PlayersLogtime) => {
					uuids.push(logtime.uuid);
					logtimes.push(logtime.logtime);
				});

				const entity = this.historyPlayersLogtimeRepo.create({
					uuids,
					logtimes,
					time,
				});
				return this.historyPlayersLogtimeRepo.save(entity).catch((e) => {
					this.logger.error(`Unable to create players logtimes history`, e);
					return null;
				});
			},
		},
		player: {
			session: async (user: PlayersLogtime): Promise<PlayersSessions | null> => {
				this.logger.debug(
					`${colors.pink}[create.player.session]${colors.green} Creating session for ${user.username} (${user.uuid})`,
				);

				const entity = this.playersSessionsRepo.create({
					connection_time: new Date(),
					user,
				});
				return this.playersSessionsRepo.save(entity).catch((e) => {
					this.logger.error(
						`Unable to create player session for ${user.username} (${user.uuid})`,
						e,
					);
					return null;
				});
			},
			logtime: async (uuid: string, username: string): Promise<PlayersLogtime | null> => {
				this.logger.debug(
					`${colors.pink}[create.player.logtime]${colors.green} Creating inital logtime for ${username} (${uuid})`,
				);

				const entity = this.playersLogtimeRepo.create({
					uuid,
					username,
					logtime: 0,
				});
				return this.playersLogtimeRepo.save(entity).catch((e) => {
					this.logger.error(
						`Unable to create player logtime for ${username} (${uuid})`,
						e,
					);
					return null;
				});
			},
		},
		server: {
			uptime: async (value: boolean): Promise<ServerUptime | null> => {
				const time = new Date();

				this.logger.debug(
					`${colors.pink}[create.server.uptime]${colors.green} Creating server uptime ${time}`,
				);

				const entity = this.serverUptimeRepo.create({
					time,
					value,
				});
				return this.serverUptimeRepo.save(entity).catch((e) => {
					this.logger.error(`Unable to create server uptime ${time}`, e);
					return null;
				});
			},
		},
		user: async (username: string): Promise<PlayersLogtime | null> => {
			/**
			 *
			 */
			this.logger.debug(
				`${colors.pink}[create.user]${colors.green} Checking if user already exist for ${username}`,
			);

			let user: PlayersLogtime | null = (await this.get.player.logtime({
				username,
			})) as PlayersLogtime;
			if (user) {
				this.logger.debug(
					`${colors.pink}[create.user]${colors.green} User already exist for ${username}`,
				);
				return user;
			}

			/**
			 *
			 */
			this.logger.debug(
				`${colors.pink}[create.user]${colors.green} User ${username} not existing `,
			);
			this.logger.debug(
				`${colors.pink}[create.user]${colors.green} Retrieving ${username} UUID`,
			);

			const uuid = await this.getMojangUUID(username);
			if (!uuid) {
				this.logger.debug(
					`${colors.pink}[create.user]${colors.green} Failed to retrieve ${username} UUID`,
				);
				return null;
			}

			/**
			 *
			 */
			this.logger.debug(
				`${colors.pink}[create.user]${colors.green} Checking if user already exist for ${uuid}`,
			);

			user = (await this.get.player.logtime({ uuid })) as PlayersLogtime;
			if (user) {
				this.logger.debug(
					`${colors.pink}[create.user]${colors.green} User already exist for ${uuid}`,
				);
				return this.update.player.username(user, username);
			}

			/**
			 *
			 */
			this.logger.debug(
				`${colors.pink}[create.user]${colors.green} Creating user ${username} (${uuid})`,
			);

			user = await this.create.player.logtime(uuid, username);
			if (!user) {
				this.logger.debug(
					`${colors.pink}[create.user]${colors.green} Failed to create user ${username} (${uuid})`,
				);
				return null;
			}

			return user;
		},
	};

	public readonly update = {
		player: {
			logtime: async (user: PlayersLogtime, value: number): Promise<PlayersLogtime> => {
				this.logger.debug(
					`${colors.pink}[update.logtime]${colors.green} Updating logtime for ${
						user.username
					} from ${user.logtime} to ${value} (${value - user.logtime})`,
				);

				user.logtime = value;
				return this.playersLogtimeRepo.save(user).catch((e) => {
					this.logger.error(
						`Unable to update player logtime for ${user.username} (${user.uuid})`,
						e,
					);
					return user;
				});
			},
			username: async (user: PlayersLogtime, username: string): Promise<PlayersLogtime> => {
				this.logger.debug(
					`${colors.pink}[update.username]${colors.green} Updating username from ${user.username} to ${username}`,
				);

				user.username = username;
				return this.playersLogtimeRepo.save(user).catch((e) => {
					this.logger.error(
						`Unable to update player username for ${user.username} (${user.uuid})`,
						e,
					);
					return user;
				});
			},
		},
	};

	public readonly delete = {
		session: async (user: PlayersLogtime): Promise<DeleteResult | null> => {
			this.logger.debug(
				`${colors.pink}[delete.session]${colors.green} Deleting session for ${user.username} (${user.uuid})`,
			);

			return this.playersSessionsRepo
				.createQueryBuilder('session')
				.delete()
				.where({ user })
				.execute()
				.catch((e) => {
					this.logger.error(
						`Unable to delete player session for ${user.username} (${user.uuid})`,
						e,
					);
					return null;
				});
		},
	};

	async getMojangUUID(username: string): Promise<string | null> {
		this.logger.debug(`${colors.pink}[getMojangUUID]${colors.green} Fetching UUID`);

		const PlayerDB:
			| PlayerDBMinecraftSuccess
			| PlayerDBMinecraftFailure
			| PlayerDBMinecraftFailover = await this.httpService
			.axiosRef({
				url: 'https://playerdb.co/api/player/minecraft/' + username,
				method: 'get',
				headers: {
					'User-Agent': this.configService.get<string>('USER_AGENT'),
					'Accept-Encoding': 'application/json',
				},
				responseType: 'json',
			})
			.then((r): PlayerDBMinecraftSuccess | PlayerDBMinecraftFailure => {
				return r.data;
			})
			.catch((e): PlayerDBMinecraftFailover => {
				this.logger.error(`Unable to get mojang uuid for ${username}`, e);
				return {
					success: false,
				};
			});

		if (!PlayerDB.success) {
			return null;
		}
		return PlayerDB.data.player.id;
	}

	async mapUUIDtoUsernames(
		logtimes: HistoryPlayersLogtime,
	): Promise<HistoryPlayersLogtimeMapped | null> {
		this.logger.debug(
			`${colors.pink}[mapUUIDtoUsernames]${colors.green} Mapping UUIDs to usernames`,
		);

		const users = await this.playersLogtimeRepo
			.createQueryBuilder('users')
			.select('users.uuid', 'users.username')
			.getMany()
			.catch((e) => {
				this.logger.error(`Unable to get users`, e);
				return null;
			});

		if (!users || !users.length) {
			return null;
		}

		const usernames = logtimes.uuids.map(
			(uuid: string) =>
				users.filter((user: PlayersLogtime) => uuid === user.uuid).shift()?.username ??
				uuid,
		);

		return {
			uuid: logtimes.uuid,
			uuids: logtimes.uuids,
			logtimes: logtimes.logtimes,
			usernames: usernames,
			time: logtimes.time,
		};
	}
}
