import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DBService } from './db.service';

import { HistoryPlayersLogtime } from 'src/entities/history/logtime.entity';
import { HistoryPlayersOnline } from 'src/entities/history/online.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';
import { PlayersSessions } from 'src/entities/players/sessions.entity';
import { ServerUptime } from 'src/entities/server_uptime.entity';

@Injectable()
export class VanillaDBService extends DBService {
	constructor(
		configService: ConfigService,
		httpService: HttpService,
		@InjectRepository(HistoryPlayersLogtime, 'vanilla')
		historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline, 'vanilla')
		historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime, 'vanilla')
		playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions, 'vanilla')
		playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime, 'vanilla')
		serverUptimeRepo: Repository<ServerUptime>,
	) {
		super(
			new Logger(VanillaDBService.name),
			configService,
			httpService,
			historyPlayersLogtimeRepo,
			historyPlayersOnlineRepo,
			playersLogtimeRepo,
			playersSessionsRepo,
			serverUptimeRepo,
		);
	}
}

@Injectable()
export class ModdedDBService extends DBService {
	constructor(
		configService: ConfigService,
		httpService: HttpService,
		@InjectRepository(HistoryPlayersLogtime, 'modded')
		historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline, 'modded')
		historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime, 'modded')
		playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions, 'modded')
		playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime, 'modded')
		serverUptimeRepo: Repository<ServerUptime>,
	) {
		super(
			new Logger(ModdedDBService.name),
			configService,
			httpService,
			historyPlayersLogtimeRepo,
			historyPlayersOnlineRepo,
			playersLogtimeRepo,
			playersSessionsRepo,
			serverUptimeRepo,
		);
	}
}
