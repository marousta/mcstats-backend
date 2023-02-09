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
import { ServerKind } from 'src/types';

@Injectable()
export class VanillaDBService extends DBService {
	constructor(
		configService: ConfigService,
		httpService: HttpService,
		@InjectRepository(HistoryPlayersLogtime, ServerKind.Vanilla)
		historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline, ServerKind.Vanilla)
		historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime, ServerKind.Vanilla)
		playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions, ServerKind.Vanilla)
		playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime, ServerKind.Vanilla)
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
		@InjectRepository(HistoryPlayersLogtime, ServerKind.Modded)
		historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline, ServerKind.Modded)
		historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime, ServerKind.Modded)
		playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions, ServerKind.Modded)
		playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime, ServerKind.Modded)
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
