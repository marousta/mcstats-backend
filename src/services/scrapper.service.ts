import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteResult } from 'typeorm';

import { DBService } from './db.service';

import { FetcherJava } from 'src/fetchers/java';
import { FetcherBedrock } from 'src/fetchers/bedrock';
import { FetcherPlayers } from 'src/fetchers/players';

import { PlayersSessions } from 'src/entities/players/sessions.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';

import colors from 'src/utils/colors';
import * as time from 'src/utils/time';
import * as utils from 'src/utils/utils';

@Injectable()
export class ScrapperService {
	private readonly logger = new Logger(ScrapperService.name);

	private readonly WEBSOCKET_PORT: number = this.config.get<number>('WEBSOCKET_PORT') ?? 0;
	private readonly QUERY_RETRY: number = this.config.get<number>('QUERY_RETRY') ?? 0;

	private readonly fetchers: {
		players: FetcherPlayers[];
		java: FetcherJava[];
		bedrock: FetcherBedrock[];
	} = {
		players: [],
		java: [],
		bedrock: [],
	};

	constructor(private readonly config: ConfigService, private readonly dbService: DBService) {
		const MC_HOST: string = this.config.get<string>('MC_HOST') ?? '';
		const MC_QUERY_PORT: number = this.config.get<number>('MC_QUERY_PORT') ?? 0;
		const MC_RCON_PORT: number = this.config.get<number>('MC_RCON_PORT') ?? 0;
		const MC_RCON_PASSWORD: string = this.config.get<string>('MC_RCON_PASSWORD') ?? '';
		const MC_MOD_HOST: string = this.config.get<string>('MC_MOD_HOST') ?? '';
		const MC_MOD_QUERY_PORT: number = this.config.get<number>('MC_MOD_QUERY_PORT') ?? 0;
		const MC_MOD_RCON_PORT: number = this.config.get<number>('MC_MOD_RCON_PORT') ?? 0;
		const MC_MOD_RCON_PASSWORD: string = this.config.get<string>('MC_MOD_RCON_PASSWORD') ?? '';
		const MC_BEDROCK_HOST: string = this.config.get<string>('MC_BEDROCK_HOST') ?? '';
		const MC_BEDROCK_PORT: number = this.config.get<number>('MC_BEDROCK_PORT') ?? 0;

		if (MC_HOST && MC_QUERY_PORT && MC_RCON_PORT && MC_RCON_PASSWORD) {
			this.fetchers.java.push(new FetcherJava(MC_HOST, MC_QUERY_PORT));
			this.fetchers.players.push(new FetcherPlayers(MC_HOST, MC_RCON_PORT, MC_RCON_PASSWORD));
		}
		if (MC_MOD_HOST && MC_MOD_QUERY_PORT && MC_MOD_RCON_PORT && MC_MOD_RCON_PASSWORD) {
			this.fetchers.java.push(new FetcherJava(MC_MOD_HOST, MC_MOD_QUERY_PORT));
			this.fetchers.players.push(
				new FetcherPlayers(MC_MOD_HOST, MC_MOD_RCON_PORT, MC_MOD_RCON_PASSWORD),
			);
		}
		if (MC_BEDROCK_HOST && MC_BEDROCK_PORT && MC_MOD_RCON_PORT && MC_MOD_RCON_PASSWORD) {
			this.fetchers.bedrock.push(new FetcherBedrock(MC_BEDROCK_HOST, MC_BEDROCK_PORT));
		}
		if (
			!this.fetchers.java.length &&
			!this.fetchers.players.length &&
			!this.fetchers.bedrock.length
		) {
			this.logger.error(
				`${colors.pink}[constructor]${colors.red} No avaliable servers to fetch data from`,
			);
			this.logger.error(`${colors.pink}[constructor]${colors.red}Check your config`);
			process.exit(1);
		}
	}

	private async updateServerStatus(status: boolean): Promise<boolean> {
		// get previous server status
		const uptime = await this.dbService.get.server.uptime();
		if (!uptime) {
			return false;
		}

		// no database entry create one based on current server status
		if (!uptime.length) {
			const created = await this.dbService.create.server.uptime(status);
			if (!created) {
				return false;
			}
			// TODO: websocket.sendUptime({
			// 	state: status,
			// 	timestamp: time.getTimestamp(),
			// });
			return true;
		}

		// server database already up to date, nothing to do
		if (uptime.pop()?.value === status) {
			return true;
		}

		// server status differ from database, updating ..
		const created = await this.dbService.create.server.uptime(status);
		if (!created) {
			return false;
		}
		// TODO: websocket.sendUptime({
		// 	state: status,
		// 	timestamp: time.getTimestamp(),
		// });
		return true;
	}

	private async initActivesSessions() {
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
		const sessions = await this.dbService.get.player.session();
		if (!sessions) {
			this.logger.error(
				`${colors.pink}[initActivesSessions]${colors.red} Unable to get players sessions from database`,
			);
			process.exit(1);
		}
		return sessions;
	}

	private actives_sessions: PlayersSessions[] | null = null;
	private server_state: boolean = true;
	private retry: number = 0;
	private max_active_players: number = 0;

	async scrapper() {
		if (this.actives_sessions === null) {
			this.actives_sessions = await this.initActivesSessions();
			this.actives_sessions?.forEach((session: PlayersSessions) => {
				this.logger.log(
					`${colors.end}${session.user.username} is ${colors.green}connected${colors.end} based on last data`,
				);
			});
		}

		const active_players_list = await this.fetchers.players[0]?.fetch();

		const player_names = active_players_list ?? [];

		// check server status and create new status if it was previously offline
		if (active_players_list && !this.server_state) {
			this.retry = 0;
			this.server_state = true;

			this.logger.log(`${colors.end}Server is ${colors.green}up${colors.end}!`);

			let ret = await this.dbService.create.server.uptime(this.server_state);
			if (!ret) {
				return false;
			}
		}

		// retrying request n times
		if (!active_players_list && this.server_state && this.retry != this.QUERY_RETRY) {
			this.retry++;
			this.logger.warn(`Server not responding`);
			return null;
		}
		// server offline closing sessions and updating logtimes
		if (!active_players_list && this.retry == this.QUERY_RETRY) {
			this.retry = 0;
			this.server_state = false;

			this.logger.log(`${colors.end}Server is ${colors.red}down${colors.end}!`);

			let ret = await this.dbService.create.server.uptime(this.server_state);
			if (!ret) {
				return false;
			}

			const end_sessions = await this.endSessions(player_names);
			if (!end_sessions) {
				return null;
			}

			// dispatch server disconnected
			return {
				timestamp: time.getTimestamp(),
				serverStatus: {
					online: this.server_state,
					since: time.getTimestamp(),
				},
				connected: [],
				playersOnline: 0,
				maxPlayersOnline: this.max_active_players,
			};
		}

		// waiting for server to respond
		if (!active_players_list && !this.server_state) {
			return null;
		}

		this.retry = 0;

		if (this.server_state && player_names.length != this.actives_sessions.length) {
			const new_sessions = await this.newSessions(player_names);
			if (!new_sessions) {
				return null;
			}

			const end_sessions = await this.endSessions(player_names);
			if (!end_sessions) {
				return null;
			}
			this.actives_sessions = await this.initActivesSessions();
		}

		// increment max_active_players
		const active_players = player_names.length;
		if (this.max_active_players < active_players) {
			this.max_active_players = active_players;
		}

		// dispatch new / removed users
		const since = await this.dbService.get.server.lastUptime();
		if (!since) {
			return null;
		}

		return {
			timestamp: time.getTimestamp(),
			server: {
				state: this.server_state,
				since: since.time,
			},
			players: {
				online: player_names.length,
				names: player_names || [],
				max_active_players: this.max_active_players,
			},
		};
	}

	async newUsers(player_names: Array<string> = []) {
		// No online players
		if (!this.actives_sessions || !this.actives_sessions.length) {
			return null;
		}

		const actives_sessions = this.actives_sessions;

		// return usernames with no user
		const diff = player_names.filter((username) => {
			if (
				actives_sessions.map((session) => session.user.username === username).includes(true)
			) {
				return false;
			}
			return null;
		});

		// create new users
		const promises: Promise<PlayersLogtime | null>[] = [];
		diff.forEach((username) =>
			username ? promises.push(this.dbService.create.user(username)) : 0,
		);
		const new_users = await Promise.all(promises);

		// check promise result
		let error = false;
		for (const user of new_users) {
			if (!user) {
				error = true;
				continue;
			}
			this.logger.log(`${user.username} is now in database!`);
		}
		if (error) {
			return null;
		}

		return new_users;
	}

	async newSessions(player_names: Array<string> = []) {
		// No online players
		if (!this.actives_sessions || !this.actives_sessions.length) {
			return false;
		}

		const actives_sessions = this.actives_sessions;

		// players joined
		if (player_names.length < actives_sessions.length) {
			return false;
		}

		// create new users if needed
		const new_users = await this.newUsers(player_names);
		if (!new_users) {
			return false;
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
			user ? promises.push(this.dbService.create.player.session(user)) : 0,
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
			return false;
		}

		//FIXME
		this.actives_sessions = [...actives_sessions, ...(new_sessions as PlayersSessions[])];

		return true;
	}

	async createLogtime(session: PlayersSessions) {
		// calc logtime
		const session_start_timestamp = new time.getTime(session.connection_time).timestamp();
		const new_logtime: number = utils.calcLogtime(
			session_start_timestamp,
			session.user.logtime,
		);

		// updating
		return this.dbService.update.player.logtime(session.user, new_logtime);
	}

	async endSessions(player_names: Array<string>) {
		// No online players
		if (!this.actives_sessions || !this.actives_sessions.length) {
			return false;
		}

		const actives_sessions = this.actives_sessions;

		// players joined
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
		for (const user of updated_users) {
			if (!user) {
				error = true;
				continue;
			}

			const old_session = diff
				.filter((session) => session.user.username === user.username)
				.shift() as PlayersSessions;
			const was = new time.getTime(user.logtime - old_session?.user.logtime).logtime();

			this.logger.log(`${colors.end}${user.username} was logged ${was}`);
		}
		if (error) {
			return false;
		}

		// remove sessions
		const promises_sessions: Promise<DeleteResult | null>[] = [];
		diff.forEach((session) =>
			promises_sessions.push(this.dbService.delete.session(session.user)),
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
			return false;
		}

		this.actives_sessions = this.actives_sessions.filter((original) => {
			!diff.map((removed) => original.uuid === removed.uuid).includes(true);
		});

		return { state: 'success' };
	}

	getActivesSessions(): PlayersSessions[] | null {
		return this.actives_sessions;
	}

	getServerState(): boolean {
		return this.server_state;
	}
}
