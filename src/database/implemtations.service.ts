import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HistoryPlayersLogtime } from '../entities/history/logtime.entity';
import { HistoryPlayersOnline } from '../entities/history/online.entity';
import { PlayersLogtime } from '../entities/players/logtime.entity';
import { PlayersSessions } from '../entities/players/sessions.entity';
import { ServerUptime } from '../entities/server_uptime.entity';

import { DBService } from './db.service';

@Injectable()
export class JavaDBService extends DBService {
	constructor(
		configService: ConfigService,
		httpService: HttpService,
		@InjectRepository(HistoryPlayersLogtime, 'java')
		historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline, 'java')
		historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime, 'java')
		playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions, 'java')
		playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime, 'java')
		serverUptimeRepo: Repository<ServerUptime>,
	) {
		super(
			new Logger(JavaDBService.name),
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

export class BedrockDBService extends DBService {
	constructor(
		configService: ConfigService,
		httpService: HttpService,
		@InjectRepository(HistoryPlayersLogtime, 'bedrock')
		historyPlayersLogtimeRepo: Repository<HistoryPlayersLogtime>,
		@InjectRepository(HistoryPlayersOnline, 'bedrock')
		historyPlayersOnlineRepo: Repository<HistoryPlayersOnline>,
		@InjectRepository(PlayersLogtime, 'bedrock')
		playersLogtimeRepo: Repository<PlayersLogtime>,
		@InjectRepository(PlayersSessions, 'bedrock')
		playersSessionsRepo: Repository<PlayersSessions>,
		@InjectRepository(ServerUptime, 'bedrock')
		serverUptimeRepo: Repository<ServerUptime>,
	) {
		super(
			new Logger(BedrockDBService.name),
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
