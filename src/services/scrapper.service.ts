import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteResult } from 'typeorm';

import { VanillaDBService, ModdedDBService } from 'src/database/implemtations.service';

import { FetcherJava } from 'src/fetchers/java';
import { FetcherBedrock } from 'src/fetchers/bedrock';
import { FetcherPlayers } from 'src/fetchers/players';

import { PlayersSessions } from 'src/entities/players/sessions.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';

import colors from 'src/utils/colors';
import * as time from 'src/utils/time';
import * as utils from 'src/utils/utils';

import { ServerKind } from 'src/types';
import { ResponseServerKind, ResponseScrapper, ResponseScrapperData } from 'src/services/types';

export class ScrapperService {
	// private readonly WEBSOCKET_PORT: number = this.config.get<number>('WEBSOCKET_PORT') ?? 0;
	private readonly QUERY_RETRY: number;

	private readonly fetchers: {
		java: FetcherJava | null;
		bedrock: FetcherBedrock | null;
		players: FetcherPlayers | null;
	} = {
		players: null,
		java: null,
		bedrock: null,
	};

	constructor(
		private readonly logger: Logger,
		private readonly config: ConfigService,
		private readonly DBService: VanillaDBService | ModdedDBService,
		private readonly kind: ServerKind,
	) {
		this.QUERY_RETRY = this.config.get<number>('QUERY_RETRY') ?? 0;
		this.QUERY_RETRY = +this.QUERY_RETRY;

		if (this.kind === ServerKind.Vanilla) {
			const MC_HOST: string = this.config.get<string>('MC_HOST') ?? '';
			const MC_QUERY_PORT: number = this.config.get<number>('MC_QUERY_PORT') ?? 0;
			const MC_RCON_PORT: number = this.config.get<number>('MC_RCON_PORT') ?? 0;
			const MC_RCON_PASSWORD: string = this.config.get<string>('MC_RCON_PASSWORD') ?? '';
			const MC_BEDROCK_HOST: string = this.config.get<string>('MC_BEDROCK_HOST') ?? '';
			const MC_BEDROCK_PORT: number = this.config.get<number>('MC_BEDROCK_PORT') ?? 0;

			if (MC_HOST && +MC_QUERY_PORT && +MC_RCON_PORT && MC_RCON_PASSWORD) {
				this.fetchers.java = new FetcherJava(ServerKind.Vanilla, MC_HOST, +MC_QUERY_PORT);
				this.fetchers.players = new FetcherPlayers(
					ServerKind.Vanilla,
					MC_HOST,
					+MC_RCON_PORT,
					MC_RCON_PASSWORD,
				);
			}
			if (MC_BEDROCK_HOST && +MC_BEDROCK_PORT) {
				this.fetchers.bedrock = new FetcherBedrock(MC_BEDROCK_HOST, +MC_BEDROCK_PORT);
			}
		}

		if (this.kind === ServerKind.Modded) {
			const MC_MOD_HOST: string = this.config.get<string>('MC_MOD_HOST') ?? '';
			const MC_MOD_QUERY_PORT: number = this.config.get<number>('MC_MOD_QUERY_PORT') ?? 0;
			const MC_MOD_RCON_PORT: number = this.config.get<number>('MC_MOD_RCON_PORT') ?? 0;
			const MC_MOD_RCON_PASSWORD: string =
				this.config.get<string>('MC_MOD_RCON_PASSWORD') ?? '';

			if (MC_MOD_HOST && +MC_MOD_QUERY_PORT && +MC_MOD_RCON_PORT && MC_MOD_RCON_PASSWORD) {
				this.fetchers.java = new FetcherJava(
					ServerKind.Modded,
					MC_MOD_HOST,
					+MC_MOD_QUERY_PORT,
				);
				this.fetchers.players = new FetcherPlayers(
					ServerKind.Modded,
					MC_MOD_HOST,
					+MC_MOD_RCON_PORT,
					MC_MOD_RCON_PASSWORD,
				);
			}
		}

		if (!this.fetchers.java || !this.fetchers.players) {
			this.logger.error(
				`${colors.pink}[constructor]${colors.red} No avaliable servers to fetch data from`,
			);
			this.logger.error(`${colors.pink}[constructor]${colors.red}Check your config`);
			process.exit(1);
		}

		this.scrap();
	}

	private async updateServerStatus(status: boolean): Promise<boolean> {
		// get previous server status
		const uptime = await this.DBService.get.server.lastUptime();
		if (uptime === null) {
			this.logger.error(
				`${colors.pink}[updateServerStatus]${colors.red} #1 Unable to get server uptime`,
			);
			return false;
		}

		// no database entry create one based on current server status
		if (uptime === false) {
			const created = await this.DBService.create.server.uptime(status);
			if (!created) {
				this.logger.error(
					`${colors.pink}[updateServerStatus]${colors.red} #2 Unable to update server uptime`,
				);
				return false;
			}
			// TODO: websocket.sendUptime({
			// 	state: status,
			// 	timestamp: time.getTimestamp(),
			// });
			return true;
		}

		// server database already up to date, nothing to do
		if (uptime.value === status) {
			return true;
		}

		// server status differ from database, updating ..
		const created = await this.DBService.create.server.uptime(status);
		if (!created) {
			this.logger.error(
				`${colors.pink}[updateServerStatus]${colors.red} #3 Unable to update server uptime`,
			);
			return false;
		}
		// TODO: websocket.sendUptime({
		// 	state: status,
		// 	timestamp: time.getTimestamp(),

		// });
		return true;
	}

	private async initActivesSessions(): Promise<PlayersSessions[]> {
		/**
		 * sessions: [
		 * 		PlayersSessions {
		 * 			uuid,
		 * 			connection_time,
		 * 			user: PlayersLogtime {
		 * 				uuid,
		 * 				username,
		 * 				logtime
		 * 			}
		 * 		}
		 * ]
		 */
		const sessions = await this.DBService.get.player.session();
		if (!sessions) {
			this.logger.error(
				`${colors.pink}[initActivesSessions]${colors.red} Unable to get players sessions from database`,
			);
			process.exit(1);
		}
		return sessions;
	}

	private actives_sessions: PlayersSessions[] | null = null;
	private server_state: boolean = false;
	// private server_up_since: Date = new Date();
	private retry: number = 0;
	private max_active_players: number = 0;

	async scrapper(): Promise<ResponseScrapperData | null> {
		if (this.actives_sessions === null) {
			this.actives_sessions = await this.initActivesSessions();
			this.actives_sessions?.forEach((session: PlayersSessions) => {
				this.logger.log(
					`${colors.end}${session.user.username} is ${colors.green}connected${colors.end} based on last data`,
				);
			});
		}

		const active_players_list = await this.fetchers.players!.fetch();
		const player_names = active_players_list ?? [];

		// check server status and create new status if it was previously offline
		if (active_players_list && !this.server_state) {
			this.retry = 0;
			this.server_state = true;

			this.logger.log(`${colors.end}Server is ${colors.green}up${colors.end}!`);

			const online = await this.updateServerStatus(true);
			if (!online) {
				this.logger.error(
					`${colors.pink}[scrapper]${colors.red} Unable to update server uptime to up`,
				);
				return null;
			}

			await this.fetchServerKind();
		}

		// retrying request n times
		if (!active_players_list && this.server_state && this.retry != this.QUERY_RETRY) {
			this.retry++;
			this.logger.warn(`${colors.pink}[scrapper]${colors.yellow} Server not responding`);
			return null;
		}

		// server offline closing sessions and updating logtimes
		if (!active_players_list && this.retry == this.QUERY_RETRY) {
			this.retry = 0;
			this.server_state = false;

			this.logger.log(`${colors.end}Server is ${colors.red}down${colors.end}!`);

			const offline = await this.updateServerStatus(false);
			if (!offline) {
				this.logger.error(
					`${colors.pink}[scrapper]${colors.red} Unable to update server uptime to down`,
				);
				return null;
			}

			const end_sessions = await this.endSessions(player_names);
			if (!end_sessions) {
				this.logger.error(
					`${colors.pink}[scrapper]${colors.red} Unable to terminate sessions`,
				);
				return null;
			}

			// dispatch server disconnected
			return {
				timestamp: time.getTimestamp(),
				server: {
					state: this.server_state,
					kind: this.server_kind,
					// since: time.getTimestamp(),
				},
				players: {
					online: 0,
					usernames: [],
					max_active_players: this.max_active_players,
				},
			};
		}

		// waiting for server to respond
		if (!active_players_list && !this.server_state) {
			return null;
		}

		this.retry = 0;

		if (this.server_state && player_names.length != this.actives_sessions.length) {
			const new_sessions = await this.newSessions(player_names);
			if (new_sessions === null) {
				this.logger.error(
					`${colors.pink}[scrapper]${colors.red} Unable to create sessions`,
				);
				return null;
			}

			const end_sessions = await this.endSessions(player_names);
			if (end_sessions === null) {
				this.logger.error(`${colors.pink}[scrapper]${colors.red} Unable to end sessions`);
				return null;
			}
			// this.actives_sessions = await this.initActivesSessions();
		}

		// increment max_active_players
		const active_players = player_names.length;
		if (this.max_active_players < active_players) {
			this.max_active_players = active_players;
		}

		// const since = await this.dbService.get.server.lastUptime();
		// if (since === null) {
		// return null;
		// }

		// this.server_up_since = since ? since.time : new Date()

		return {
			timestamp: time.getTimestamp(),
			server: {
				state: this.server_state,
				kind: this.server_kind,
				// since: new time.getTime(this.server_up_since).timestamp(),
			},
			players: {
				online: player_names.length,
				usernames: player_names || [],
				max_active_players: this.max_active_players,
			},
		};
	}

	async newUsers(player_names: Array<string>): Promise<PlayersLogtime[] | null> {
		const actives_sessions = this.actives_sessions ?? [];

		// return usernames with no user
		const diff = player_names.filter((username) => {
			if (
				actives_sessions.map((session) => session.user.username === username).includes(true)
			) {
				return false;
			}
			return true;
		});

		// create new users
		const promises: Promise<PlayersLogtime | null>[] = [];
		diff.forEach((username) =>
			username ? promises.push(this.DBService.create.user(username)) : 0,
		);
		const new_users = await Promise.all(promises);

		// check promise result
		let error = false;
		new_users.forEach((user) => (!user ? (error = true) : 0));
		if (error) {
			return null;
		}

		return new_users as PlayersLogtime[];
	}

	async newSessions(player_names: Array<string>): Promise<boolean | null> {
		// No online players
		if (!player_names.length) {
			return false;
		}

		const actives_sessions = this.actives_sessions ?? [];

		// players joined
		if (player_names.length < actives_sessions.length) {
			return false;
		}

		// create new users if needed
		const new_users = await this.newUsers(player_names);
		if (!new_users) {
			return null;
		}

		// Only new online players
		let diff = actives_sessions.map((session) => {
			if (player_names.map((username) => username === session.user.username)) {
				return null;
			}
			return session.user;
		});

		// merge current users with new users
		diff = [...diff, ...new_users];

		// create sessions
		const promises: Promise<PlayersSessions | null>[] = [];
		diff.forEach((user) =>
			user ? promises.push(this.DBService.create.player.session(user)) : 0,
		);
		const new_sessions = await Promise.all(promises);

		// check promise result
		let error = false;
		for (const session of new_sessions) {
			if (!session) {
				error = true;
				continue;
			}
			this.logger.log(
				`${colors.end}${session.user.username} is ${colors.green}connected${colors.end}!`,
			);
		}
		if (error) {
			return null;
		}

		//FIXME
		this.actives_sessions = [...actives_sessions, ...(new_sessions as PlayersSessions[])];

		return true;
	}

	async createLogtime(session: PlayersSessions): Promise<PlayersLogtime> {
		// calc logtime
		const session_start_timestamp = new time.getTime(session.connection_time).timestamp();
		const new_logtime: number = utils.calcLogtime(
			session_start_timestamp,
			session.user.logtime,
		);

		// updating
		return this.DBService.update.player.logtime(session.user, new_logtime);
	}

	async endSessions(player_names: Array<string>): Promise<boolean | null> {
		const actives_sessions =
			this.actives_sessions?.filter((x) => !player_names.includes(x.user.username)) ?? [];

		// players left
		if (player_names.length > actives_sessions.length) {
			return false;
		}

		let diff = actives_sessions
			.map((session) => {
				if (player_names.map((username) => username === session.user.username)) {
					return session;
				}
				return null;
			})
			.filter((x) => x !== null) as PlayersSessions[];

		// create logtime
		const promises_logtimes: Promise<PlayersLogtime | null>[] = [];
		diff.forEach((session) => promises_logtimes.push(this.createLogtime(session)));
		const updated_users = await Promise.all(promises_logtimes);

		// check promise result
		let error = false;
		updated_users.forEach((user) => {
			if (!user) {
				error = true;
				return;
			}

			const old_session = diff
				.filter((session) => session.user.username === user.username)
				.shift() as PlayersSessions;

			const was = new time.getTime(
				time.getTimestamp() - new time.getTime(old_session.connection_time).timestamp(),
			).logtime();

			this.logger.log(`${colors.end}${user.username} was logged ${was}`);
		});
		if (error) {
			return null;
		}

		// remove sessions
		const promises_sessions: Promise<DeleteResult | null>[] = [];
		diff.forEach((session) =>
			promises_sessions.push(this.DBService.delete.session(session.user)),
		);
		const deleted_sessions = await Promise.all(promises_sessions);

		// check promise result
		error = false;
		for (const i in deleted_sessions) {
			if (!deleted_sessions[i]) {
				error = true;
				continue;
			}

			const username = (diff[i] as PlayersSessions).user.username;

			this.logger.log(`${colors.end}${username} is ${colors.red}disconnected${colors.end}!`);
		}
		if (error) {
			return null;
		}

		this.actives_sessions = actives_sessions.filter((original) => {
			!diff.map((removed) => original.uuid === removed.uuid).includes(true);
		});

		return true;
	}

	private scrapped: ResponseScrapper;
	private server_kind: ResponseServerKind[] = [];

	async fetchServerKind() {
		const java = await this.fetchers.java!.fetch();
		if (!java) {
			return;
		}
		this.server_kind[0] = java;

		const bedrock = await this.fetchers.bedrock?.fetch();
		if (!bedrock) {
			return;
		}
		this.server_kind[1] = bedrock;
	}

	async scrap() {
		await this.fetchServerKind();

		setInterval(async () => {
			const scrapped = await this.scrapper();
			if (!scrapped) {
				return;
			}
			this.logger.verbose(`${colors.pink}[interval.scrap]${colors.cyan} OK`);
			this.scrapped = {
				vanilla: scrapped,
				modded: null,
			};
		}, 3000);
		setInterval(async () => {
			const t = new time.getTime().half().split(':');
			const hours = parseInt(t[0]);
			const mins = parseInt(t[1]);

			// create logtime history each days at 12:00pm
			if (hours === 0 && mins === 0) {
				const logtime = await this.save.history.logtime();
				if (!logtime) {
					this.logger.error(
						`${colors.pink}[save.history.logtime]${colors.red} Failed to create players logtimes history`,
					);
				}
			}

			// create max players online history every 6 hours
			if (hours % 6 || (hours % 6 === 0 && mins % 60)) {
				return;
			}
			const online = this.save.history.online();
			if (!online) {
				this.logger.error(
					`${colors.pink}[save.history.online]${colors.red} Failed to create max players online history`,
				);
			}
		}, 60000);
	}

	private readonly save = {
		history: {
			logtime: async () => {
				let logtimes = (await this.DBService.get.player.logtime()) as
					| PlayersLogtime[]
					| null;

				if (!logtimes) {
					this.logger.error(
						`${colors.pink}[save.history.logtime]${colors.red} Failed to get players logtimes history`,
					);
					return false;
				}

				// No logtimes to save yet
				if (!logtimes.length) {
					return true;
				}

				// sort by username asc
				logtimes = logtimes.sort((a, b) => {
					if (a.username.toLowerCase() < b.username.toLowerCase()) {
						return -1;
					}
					if (a.username.toLowerCase() > b.username.toLowerCase()) {
						return 1;
					}
					return 0;
				});
				const actives_sessions =
					this.actives_sessions?.sort((a, b) => {
						if (a.user.username.toLowerCase() < b.user.username.toLowerCase()) {
							return -1;
						}
						if (a.user.username.toLowerCase() > b.user.username.toLowerCase()) {
							return 1;
						}
						return 0;
					}) ?? [];

				const history_uuids: string[] = logtimes.map((user) => user.uuid);
				const history_logtimes: number[] = logtimes.map((user) => user.logtime);

				// update logtimes with current logtimes from actives sessions
				for (const i in history_uuids) {
					for (const session of actives_sessions) {
						if (session.user.uuid === history_uuids[i]) {
							history_logtimes[i] = utils.calcLogtime(
								new time.getTime(session.connection_time).timestamp(),
								session.user.logtime,
							);
						}
					}
				}

				const created = await this.DBService.create.history.logtime(
					history_uuids,
					history_logtimes,
				);

				return created ? true : false;
			},
			online: async () => {
				this.logger.log(
					`${colors.pink}[updatePlayersOnline]${colors.end} current: [ ${
						this.actives_sessions ? this.actives_sessions.length : 0
					} / 60 ] max: ${this.max_active_players}`,
				);
				const online = await this.DBService.create.history.online(this.max_active_players);
				if (!online) {
					return false;
				}
				this.max_active_players = 0;
				return true;
			},
		},
	};

	getActivesSessions(): PlayersSessions[] | null {
		return this.actives_sessions;
	}

	getServerState(): boolean {
		return this.server_state;
	}

	getScrapped(): ResponseScrapper {
		return this.scrapped;
	}
}

@Injectable()
export class ScrapperVanillaService extends ScrapperService {
	constructor(config: ConfigService, DBService: VanillaDBService) {
		super(new Logger(ScrapperVanillaService.name), config, DBService, ServerKind.Vanilla);
	}
}

@Injectable()
export class ScrapperModdedService extends ScrapperService {
	constructor(config: ConfigService, DBService: ModdedDBService) {
		super(new Logger(ScrapperModdedService.name), config, DBService, ServerKind.Modded);
	}
}
