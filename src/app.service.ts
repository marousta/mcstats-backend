import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogtimeHistory } from './entities/logtime_history.entity';
import { LogtimePlayers } from './entities/logtime_players.entity';
import { PlayersOnline } from './entities/players_online.entity';
import { ServerUptime } from './entities/server_uptime.entity';

@Injectable()
export class AppService {
	private readonly logger = new Logger(AppService.name);

	constructor(
		@InjectRepository(LogtimeHistory) logtimeHistoryRepo: Repository<LogtimeHistory>,
		@InjectRepository(LogtimePlayers) logtimePlayersRepo: Repository<LogtimePlayers>,
		@InjectRepository(PlayersOnline) playersOnlineRepo: Repository<PlayersOnline>,
		@InjectRepository(ServerUptime) ServerUptimeRepo: Repository<ServerUptime>,
	) {}
}
