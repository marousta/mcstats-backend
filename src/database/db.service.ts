import { Logger } from '@nestjs/common';
import { DeleteResult, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { MojangUUID } from 'src/services/mojangUUID.service';

import {
	HistoryPlayersLogtime,
	HistoryPlayersLogtimeMapped,
} from 'src/entities/history/logtime.entity';
import { HistoryPlayersOnline } from 'src/entities/history/online.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';
import { PlayersSessions } from 'src/entities/players/sessions.entity';
import { ServerUptime } from 'src/entities/server_uptime.entity';

import colors from 'src/utils/colors';

export class DBService {
	constructor(
		private readonly logger: Logger,
		private readonly mojangUUID: MojangUUID,
		private readonly historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		private readonly historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		private readonly playersLogtimeRepo: Repository<PlayersLogtime>,
		private readonly playersSessionsRepo: Repository<PlayersSessions>,
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
					.orderBy('time', 'ASC')
					.getMany()
					.catch((e) => {
						this.logger.error(
							`${colors.pink}[get.history.online]${colors.red} Unable to get online players`,
							e,
						);
						return null;
					});
			},
			logtime: async (): Promise<HistoryPlayersLogtime | null> => {
				this.logger.debug(
					`${colors.pink}[get.history.logtime]${colors.green} Getting players logtime history`,
				);

				return this.historyPlayersLogtimeRepo
					.createQueryBuilder()
					.select()
					.orderBy('time', 'DESC')
					.getOne()
					.catch((e) => {
						this.logger.error(
							`${colors.pink}[get.history.logtime]${colors.red} Unable to get players logtime history`,
							e,
						);
						return null;
					});
			},
			logtimes: async (): Promise<HistoryPlayersLogtime[] | null> => {
				this.logger.debug(
					`${colors.pink}[get.history.logtimes]${colors.green} Getting players logtime history`,
				);

				return this.historyPlayersLogtimeRepo
					.createQueryBuilder()
					.select()
					.orderBy('time', 'ASC')
					.getMany()
					.catch((e) => {
						this.logger.error(
							`${colors.pink}[get.history.logtimes]${colors.red} Unable to get players logtime history`,
							e,
						);
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
					.leftJoinAndSelect('sessions.user', 'user')
					.where(user ? { user } : {})
					.getMany()
					.catch((e) => {
						if (user) {
							this.logger.error(
								`${colors.pink}[get.player.session]${
									colors.red
								} Unable to get player session${
									user ? ` for ${user.username} (${user.uuid})` : ''
								}`,
								e,
							);
						} else {
							this.logger.error(
								`${colors.pink}[get.player.session]${colors.red} Unable to get players sessions`,
								e,
							);
						}
						return null;
					});
			},
			logtime: async (
				where: Object = {},
			): Promise<PlayersLogtime | PlayersLogtime[] | null> => {
				this.logger.debug(
					`${colors.pink}[get.player.user]${
						colors.green
					} Getting logtime where ${JSON.stringify(where)}`,
				);

				if (!Object.keys(where).length) {
					return this.playersLogtimeRepo
						.createQueryBuilder()
						.select()
						.orderBy('username', 'ASC')
						.getMany()
						.catch((e) => {
							this.logger.debug(
								`${colors.pink}[get.player.user]${colors.green} Unable to get players logtimes`,
								e,
							);
							return null;
						});
				} else {
					return this.playersLogtimeRepo
						.createQueryBuilder()
						.select()
						.where(where)
						.getOne()
						.catch((e) => {
							this.logger.debug(
								`${colors.pink}[get.player.user]${
									colors.green
								} Unable to get player logtime where ${JSON.stringify(where)}`,
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
					`${colors.pink}[get.server.uptime]${colors.green} Getting server uptime history`,
				);

				return this.serverUptimeRepo
					.createQueryBuilder()
					.select()
					.orderBy('time', 'ASC')
					.getMany()
					.catch((e) => {
						this.logger.debug(
							`${colors.pink}[get.server.uptime]${colors.green} Unable to get server uptime history`,
							e,
						);
						return null;
					});
			},
			lastUptime: async (): Promise<ServerUptime | false | null> => {
				this.logger.debug(
					`${colors.pink}[get.server.lastUptime]${colors.green} Getting server uptime`,
				);

				return this.serverUptimeRepo
					.createQueryBuilder()
					.select()
					.orderBy('time', 'DESC')
					.getOne()
					.then((r) => (r ? r : false))
					.catch((e) => {
						this.logger.debug(
							`${colors.pink}[get.server.lastUptime]${colors.green} Unable to get server uptime`,
							e,
						);
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
		users: async (): Promise<PlayersLogtime[] | null> => {
			return this.playersLogtimeRepo
				.createQueryBuilder('users')
				.select(['users.uuid', 'users.username'])
				.getMany()
				.catch((e) => {
					this.logger.debug(
						`${colors.pink}[initTranslationTable]${colors.green} Unable to get users`,
						e,
					);
					return null;
				});
		},
	};

	public readonly create = {
		history: {
			logtime: async (
				uuids: string[],
				logtimes: number[],
			): Promise<HistoryPlayersLogtime | null> => {
				const time = new Date();

				this.logger.debug(
					`${colors.pink}[create.history.logtime]${colors.green} Creating create players logtime history for ${time}`,
				);

				const entity = this.historyPlayersLogtimeRepo.create({
					uuids,
					logtimes,
					time,
				});
				return this.historyPlayersLogtimeRepo.save(entity).catch((e) => {
					this.logger.debug(
						`${colors.pink}[create.history.logtime]${colors.green} Unable to create players logtimes history`,
						e,
					);
					return null;
				});
			},
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
					this.logger.debug(
						`${colors.pink}[create.history.online]${colors.green} Unable to create online players history`,
						e,
					);
					return null;
				});
			},
		},
		player: {
			session: async (user: PlayersLogtime): Promise<PlayersSessions | null> => {
				this.logger.debug(
					`${colors.pink}[create.player.session]${colors.green} Creating session for ${user.username} (${user.uuid})`,
				);

				const exist = await this.get.player.session(user);
				if (exist && exist.length) {
					this.logger.warn(
						`${colors.pink}[create.player.session]${colors.yellow} ${exist.length} sessions already exist for ${user.username} (${user.uuid})`,
					);
					return null;
				}

				const entity = this.playersSessionsRepo.create({
					connection_time: new Date(),
					user,
				});
				return this.playersSessionsRepo.save(entity).catch((e) => {
					this.logger.debug(
						`${colors.pink}[create.player.session]${colors.green} Unable to create player session for ${user.username} (${user.uuid})`,
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
					this.logger.debug(
						`${colors.pink}[create.player.logtime]${colors.green} Unable to create player logtime for ${username} (${uuid})`,
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
					this.logger.debug(
						`${colors.pink}[create.server.uptime]${colors.green} Unable to create server uptime ${time}`,
						e,
					);
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
			})) as PlayersLogtime | null;
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

			// Bedrock players
			let uuid: string | null = null;
			if (username[0] === '.') {
				this.logger.debug(
					`${colors.pink}[create.user]${colors.green} Generating ${username} UUID`,
				);
				uuid = randomUUID();
			} else {
				// Java players
				this.logger.debug(
					`${colors.pink}[create.user]${colors.green} Retrieving ${username} UUID`,
				);
				uuid = await this.mojangUUID.get(username);
				if (!uuid) {
					this.logger.debug(
						`${colors.pink}[create.user]${colors.green} Failed to retrieve ${username} UUID`,
					);
					return null;
				}
			}

			/**
			 *
			 */
			this.logger.debug(
				`${colors.pink}[create.user]${colors.green} Checking if user already exist for ${uuid}`,
			);

			user = (await this.get.player.logtime({ uuid })) as PlayersLogtime | null;
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
					`${colors.pink}[update.player.logtime]${colors.green} Updating logtime for ${
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
					`${colors.pink}[update.player.username]${colors.green} Updating username from ${user.username} to ${username}`,
				);

				user.username = username;
				return this.playersLogtimeRepo.save(user).catch((e) => {
					this.logger.debug(
						`${colors.pink}[update.player.username]${colors.green} Unable to update player username for ${user.username} (${user.uuid})`,
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
					this.logger.debug(
						`${colors.pink}[delete.session]${colors.green} Unable to delete player session for ${user.username} (${user.uuid})`,
						e,
					);
					return null;
				});
		},
	};

	public readonly migrate = {
		server: {
			uptime: (entity: ServerUptime) => {
				return this.serverUptimeRepo.save(entity).catch((e) => {
					this.logger.error(
						`${colors.pink}[migrate.server.uptime]${colors.red} Unable to insert entity`,
					);
					return null;
				});
			},
		},
		history: {
			logtime: (entity: HistoryPlayersLogtime) => {
				return this.historyPlayersLogtimeRepo.save(entity).catch((e) => {
					this.logger.error(
						`${colors.pink}[migrate.history.logtime]${colors.red} Unable to insert entity`,
					);
					return null;
				});
			},
			online: (entity: HistoryPlayersOnline) => {
				return this.historyPlayersOnlineRepo.save(entity).catch((e) => {
					this.logger.error(
						`${colors.pink}[migrate.history.online]${colors.red} Unable to insert entity`,
					);
					return null;
				});
			},
		},
		player: {
			logtime: (entity: PlayersLogtime) => {
				return this.playersLogtimeRepo.save(entity).catch((e) => {
					this.logger.error(
						`${colors.pink}[migrate.player.logtime]${colors.red} Unable to insert entity`,
					);
					return null;
				});
			},
		},
	};

	public translation_table: { [key: string]: string } = {};

	async initTranslationTable(): Promise<void> {
		if (Object.keys(this.translation_table).length) {
			return;
		}

		const users = await this.get.users();
		if (!users) {
			if (!users) {
				this.logger.error(
					`${colors.pink}[initTranslationTable]${colors.green} Unable to create translation table for converting Mojang UUIDs to usernames`,
				);
				process.exit(1);
			}
		}

		users.forEach((user) => (this.translation_table[user.uuid] = user.username));
	}

	public readonly mapUsernames = {
		arrayLogtimeHistory: async (
			logtimes: HistoryPlayersLogtime[],
		): Promise<HistoryPlayersLogtimeMapped[]> => {
			this.logger.debug(
				`${colors.pink}[arrayLogtimeHistory]${colors.green} Mapping UUIDs to usernames`,
			);

			const promises: Promise<HistoryPlayersLogtimeMapped>[] = [];
			logtimes.forEach((history) => promises.push(this.mapUsernames.logtimeHistory(history)));

			return await Promise.all(promises);
		},
		logtimeHistory: async (
			logtimes: HistoryPlayersLogtime,
		): Promise<HistoryPlayersLogtimeMapped> => {
			this.logger.debug(
				`${colors.pink}[mapUUIDtoUsernames]${colors.green} Mapping UUIDs to usernames`,
			);

			await this.initTranslationTable();

			const usernames = logtimes.uuids.map(
				(uuid: string) => this.translation_table[uuid] ?? uuid,
			);

			return {
				uuid: logtimes.uuid,
				uuids: logtimes.uuids,
				logtimes: logtimes.logtimes,
				usernames: usernames,
				time: logtimes.time,
			};
		},
		// sessions: async (
		// 	sessions: PlayersSessions[],
		// ): Promise<PlayersSessionsMapped[] | null> => {
		// 	this.logger.debug(
		// 		`${colors.pink}[mapUUIDtoUsernames]${colors.green} Mapping UUIDs to usernames`,
		// 	);

		// 	const users = await this.playersLogtimeRepo
		// 		.createQueryBuilder('users')
		// 		.select('users.uuid', 'users.username')
		// 		.getMany()
		// 		.catch((e) => {
		// 			this.logger.error(`Unable to get users`, e);
		// 			return null;
		// 		});

		// 	if (!users || !users.length) {
		// 		return null;
		// 	}

		// 	sessions.map((uuid: string) =>
		// 		users.filter((user: PlayersLogtime) => uuid === user.uuid).shift()?.username ?? uuid,
		// 	);
		// }
	};
}
