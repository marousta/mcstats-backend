import { Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import ProgressBar = require('progress');
import { readFileSync } from 'fs';

import { ModdedDBService, VanillaDBService } from 'src/database/implemtations.service';
import { MojangUUID } from 'src/services/mojangUUID.service';

import { HistoryPlayersLogtime } from 'src/entities/history/logtime.entity';
import { HistoryPlayersOnline } from 'src/entities/history/online.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';
import { ServerUptime } from 'src/entities/server_uptime.entity';

import colors from 'src/utils/colors';
import { MigrationTable, MigrationTableKey, TranslationTable } from './types';

export class Migrate {
	private readonly logger = new Logger(Migrate.name);

	private readonly migration_table: MigrationTable = {
		['history_players_logtime']: {
			name: 'history_players_logtime',
			entity: HistoryPlayersLogtime,
			translate: {
				uuid: 'uuid',
				uuids: 'uuids',
				logtimes: 'logtimes',
				time: 'time',
			},
			convert: {
				uuid: this.genUUID,
				uuids: this.getUUIDsArray,
				logtimes: this.getLogtimesArray,
				time: this.genTime,
			},
		},
		['logtime_history']: {
			name: 'history_players_logtime',
			entity: HistoryPlayersLogtime,
			translate: {
				uuid: 'id',
				uuids: 'username',
				logtimes: 'logtime',
				time: 'itime',
			},
			convert: {
				uuid: this.genUUID,
				uuids: this.getUUIDsArray,
				logtimes: this.getLogtimesArray,
				time: this.genTime,
			},
		},
		['players_online']: {
			name: 'history_players_online',
			entity: HistoryPlayersOnline,
			translate: {
				uuid: 'id',
				time: 'itime',
				value: 'value',
			},
			convert: {
				uuid: this.genUUID,
				time: this.genTime,
				value: this.getValue,
			},
		},
		['history_players_online']: {
			name: 'history_players_online',
			entity: HistoryPlayersOnline,
			translate: {
				uuid: 'uuid',
				time: 'time',
				value: 'value',
			},
			convert: {
				uuid: this.genUUID,
				time: this.genTime,
				value: this.getValue,
			},
		},
		['players_logtime']: {
			name: 'players_logtime',
			entity: PlayersLogtime,
			translate: {
				uuid: 'id',
				username: 'username',
				logtime: 'logtime',
			},
			convert: {
				uuid: this.getMojangUUID,
				username: this.getUsername,
				logtime: this.getLogtime,
			},
		},
		['server_uptime']: {
			name: 'server_uptime',
			entity: ServerUptime,
			translate: {
				uuid: 'id',
				time: 'itime',
				value: 'value',
			},
			convert: {
				uuid: this.genUUID,
				time: this.genTime,
				value: this.getBoolean,
			},
		},
	};

	private translation_table: TranslationTable = {};
	private file_content: Array<any>;
	private table: MigrationTableKey;
	private result: Array<
		HistoryPlayersLogtime | HistoryPlayersOnline | PlayersLogtime | ServerUptime
	>;
	private progressbar: ProgressBar;

	constructor(
		private readonly DBservice: VanillaDBService | ModdedDBService,
		private readonly mojangUUID: MojangUUID,
		private readonly dryrun: boolean,
	) {
		this.result = [];
	}

	init(filename: string): this {
		try {
			const read = readFileSync(filename, 'utf-8');
			const json = JSON.parse(read);

			if (!json) {
				this.logger.error(`${colors.pink}[parse]${colors.green} Invalid file. #1`);
				process.exit(1);
			}

			const names = Object.keys(json);
			if (!names || !names.length || names.length !== 1 || !names[0]) {
				this.logger.error(`${colors.pink}[parse]${colors.green} Invalid file. #2`);
				process.exit(1);
			}

			const name = names[0];
			const table = this.migration_table[name];
			if (!table) {
				this.logger.error(`${colors.pink}[parse]${colors.green} Invalid file. #3`);
				process.exit(1);
			}
			this.table = table;

			const content = json[name];
			if (!content) {
				this.logger.error(`${colors.pink}[parse]${colors.green} Invalid file. #4`);
				process.exit(1);
			}
			this.file_content = content;

			return this;
		} catch (e) {
			this.logger.error(
				`${colors.pink}[init]${colors.green} Unable to read file: ${filename}`,
				e,
			);
			process.exit(1);
		}
	}

	async parse(): Promise<this> {
		const content = this.file_content;
		if (!content) {
			throw new Error('You must initialize first.');
		}

		this.progressbar = new ProgressBar('Parsing [:bar] :rate data/s :percent :etas', {
			total: content.length,
		});

		const methods = this.table.convert;
		const entity = this.table.entity;
		const translate = this.table.translate;

		for (const entry of content) {
			let result:
				| HistoryPlayersLogtime
				| HistoryPlayersOnline
				| PlayersLogtime
				| ServerUptime;
			// uuid			string				methods['uuid']
			// username		string				methods['username']
			// logtime		number				methods['logtime']
			// uuids		string[]			methods['uuids']
			// logtimes		number[]			methods['logtimes']
			// time			Date				methods['time']
			// value		number | boolean	methods['value']

			// prettier-ignore
			switch (entity) {
				case ServerUptime:
					result = new ServerUptime();
					result.uuid =	(await methods['uuid']!		({	self: this, value: entry[translate['uuid']!] 	})) as string;
					result.time =	(await methods['time']!		({	self: this, value: entry[translate['time']!] 	})) as Date;
					result.value =	(await methods['value']!	({	self: this, value: entry[translate['value']!] 	})) as boolean;
					break;

				case HistoryPlayersLogtime:
					result = new HistoryPlayersLogtime();
					result.uuid =		(await methods['uuid']!		({		self: this, value: entry[translate['uuid']!] 		})) as string;
					result.uuids =		(await methods['uuids']!	({		self: this, value: entry[translate['uuids']!] 		})) as string[];
					result.logtimes =	(await methods['logtimes']!	({		self: this, value: entry[translate['logtimes']!] 	})) as number[];
					result.time =		(await methods['time']!		({		self: this, value: entry[translate['time']!] 		})) as Date;

					if (result.uuids.length !==	result.logtimes.length) {
						this.logger.error(`${colors.pink}[parse]${colors.green} Unable to process file. #3`,);
						this.logger.error(`${colors.pink}[parse]${colors.green} Array length differ uuids=${result.uuids} logtimes=${result.logtimes}`,);
						process.exit(1);
					}
					break;

				case HistoryPlayersOnline:
					result = new HistoryPlayersOnline();
					result.uuid =	(await methods['uuid']!		({	self: this, value: entry[translate['uuid']!] 	})) as string;
					result.time =	(await methods['time']!		({	self: this, value: entry[translate['time']!] 	})) as Date;
					result.value =	(await methods['value']!	({	self: this, value: entry[translate['value']!] 	})) as number;
					break;

				case PlayersLogtime:
					result = new PlayersLogtime();
					result.uuid =		(await methods['uuid']!		({	self: this, uuid: entry[translate['uuid']!], username: entry[translate['username']!] 	})) as string;
					result.username =	(await methods['username']!	({	self: this, value: result.uuid															})) as string;
					result.logtime =	(await methods['logtime']!	({	self: this, value: entry[translate['logtime']!] 										})) as number;
					break;

				default:
					this.logger.error(`${colors.pink}[parse]${colors.green} Unable to process file. #2`,);
					process.exit(1);
				}

			if (!result) {
				this.logger.error(
					`${colors.pink}[parse]${colors.green} Unable to process file. #1`,
				);
				process.exit(1);
			}
			this.result.push(result);
			this.progressbar.interrupt(`Entity ${entry[translate['uuid'] as string]} OK`);
			this.progressbar.tick();
		}
		this.progressbar.terminate();
		return this;
	}

	async save(): Promise<void> {
		if (!this.file_content) {
			throw new Error('You must init() first.');
		}

		const data = this.result;
		if (!data || !data.length) {
			throw new Error('You must parse() first.');
		}

		const entity = this.table.entity;

		this.progressbar = new ProgressBar('Inserting [:bar] :rate data/s :percent :etas', {
			total: data.length,
		});

		for (const entry of data) {
			let ret:
				| HistoryPlayersLogtime
				| HistoryPlayersOnline
				| PlayersLogtime
				| ServerUptime
				| null;
			// prettier-ignore
			switch (entity) {
				case ServerUptime:
					ret = await this.DBservice.migrate.server.uptime(entry as ServerUptime);
					break;

				case HistoryPlayersLogtime:
					ret = await this.DBservice.migrate.history.logtime(entry as HistoryPlayersLogtime);
					break;

				case HistoryPlayersOnline:
					ret = await this.DBservice.migrate.history.online(entry as HistoryPlayersOnline);
					break;

				case PlayersLogtime:
					ret = await this.DBservice.migrate.player.logtime(entry as PlayersLogtime);
					break;

				default:
					this.logger.error(`${colors.pink}[run]${colors.green} Unable to process parsed data`,);
					process.exit(1);
			}
			if (!ret) {
				this.logger.error(
					`${colors.pink}[run]${colors.green} Unable to add parsed data to database`,
				);
				process.exit(1);
			}
			this.progressbar.interrupt(`Entity ${entry.uuid} OK`);
			this.progressbar.tick();
		}
		this.progressbar.terminate();
	}

	getParsed(): any {
		return this.result;
	}

	private async initTranslationTable(self: Migrate): Promise<void> {
		if (Object.keys(self.translation_table).length) {
			return;
		}

		const users = await self.DBservice.get.users();
		if (!users) {
			if (!users) {
				self.logger.error(
					`${colors.pink}[initTranslationTable]${colors.green} Unable to create translation table for converting Mojang UUIDs to usernames`,
				);
				process.exit(1);
			}
		}

		users.forEach((user) => (self.translation_table[user.username] = user.uuid));
	}

	private async genUUID({
		self,
		value,
	}: {
		self: Migrate;
		value: number | string;
	}): Promise<string> {
		if (typeof value === 'string') {
			return value;
		}
		return randomUUID();
	}

	private async getUsername({ self, value }: { self: Migrate; value: string }): Promise<string> {
		const user = (await self.DBservice.get.player.logtime({
			uuid: value,
		})) as PlayersLogtime | null;
		if (!user) {
			this.logger.error(
				`${colors.pink}[getUsername]${colors.green} Unable to find username in database`,
			);
			process.exit(1);
		}
		return user.username;
	}

	private async getLogtime({ self, value }: { self: Migrate; value: string }): Promise<string> {
		return value;
	}

	private async parseArray({
		self,
		value,
	}: {
		self: Migrate;
		value: string;
	}): Promise<string[] | number[]> {
		const parse = value
			.replace('{', '')
			.replace('}', '')
			.split(',')
			.map((v) => v.replace(' ', ''));
		if (parse.length && parse[0] && !isNaN(+parse[0])) {
			return parse.map((v) => +v);
		}
		return parse;
	}

	private async getLogtimesArray({
		self,
		value,
	}: {
		self: Migrate;
		value: string;
	}): Promise<number[]> {
		return self.parseArray({ self, value }) as Promise<number[]>;
	}

	private async genTime({
		self,
		value,
	}: {
		self: Migrate;
		value: number | string;
	}): Promise<Date> {
		if (typeof value === 'number') {
			return new Date(value * 1000);
		}
		return new Date(value);
	}

	private async getValue({ self, value }: { self: Migrate; value: number }): Promise<number> {
		return value;
	}

	private async getBoolean({ self, value }: { self: Migrate; value: boolean }): Promise<boolean> {
		return value;
	}

	private async getMojangUUID({
		self,
		uuid,
		username,
	}: {
		self: Migrate;
		uuid: number | string;
		username: string;
	}): Promise<string | null> {
		await self.initTranslationTable(self);

		if (typeof uuid === 'string') {
			return uuid;
		}
		const found = self.translation_table[username];
		if (found) {
			self.progressbar.interrupt(
				`-> Getting ${username} UUID from ${colors.green}cache${colors.end}`,
			);
			return found;
		}

		let new_uuid: string;
		if (username.charAt(0) === '.') {
			new_uuid = randomUUID();
		} else {
			self.progressbar.interrupt(
				`-> Getting ${username} UUID from ${colors.blue}Mojang${colors.end}`,
			);

			const mojang_uuid = await self.mojangUUID.get(username);
			if (!mojang_uuid) {
				self.logger.error(
					`${colors.pink}[getMojangUUID]${colors.green} Unable to get UUID from Mojang`,
				);
				process.exit(1);
			}
			new_uuid = mojang_uuid;
		}

		if (!this.dryrun) {
			const user = await self.DBservice.create.player.logtime(new_uuid, username);
			if (!user) {
				self.logger.error(
					`${colors.pink}[getMojangUUID]${colors.green} Unable to create user ${username} (${new_uuid})`,
				);
				process.exit(1);
			}
		}

		self.translation_table[username] = new_uuid;

		return new_uuid;
	}

	private async getUUIDsArray({
		self,
		value,
	}: {
		self: Migrate;
		value: string;
	}): Promise<string[]> {
		const parse = await self.parseArray({ self, value });
		if (parse.length && parse[0] && typeof parse[0] === 'string') {
			if (isUUID(parse[0])) {
				return parse as string[];
			}

			const promise: string[] = [];
			for (const entry of parse as string[]) {
				const uuid = await self.getMojangUUID({ self, uuid: -1, username: entry });
				if (!uuid) {
					process.exit(1);
				}
				promise.push(uuid);
			}
			return promise;
		}
		self.logger.error(`${colors.pink}[getUUIDsArray]${colors.green} Invalid UUID`);
		process.exit(1);
	}
}
