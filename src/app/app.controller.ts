import { Controller, Get, Request } from '@nestjs/common';

import { ModdedChartsService, VanillaChartsService } from 'src/services/charts.service';
import { ModdedScrapperService, VanillaScrapperService } from 'src/services/scrapper.service';
import {
	ResponseHistoryPlayersLogtimes,
	ResponseHistoryPlayersMaxOnline,
	ResponseHistoryServerUptime,
	ResponseServerInfos,
} from 'src/services/types';
import { ServerKind } from 'src/types';

import moduleLoader from 'src/utils/module_loader';

import { ResponsePlayersCurrentlyOnline } from './types';

@Controller()
export class AppController {
	private readonly modules: string[] = moduleLoader().controllers.map((entry: any) =>
		(entry.name as string).replace('Controller', '').toLowerCase(),
	);

	@Get('ping')
	ping(): string {
		return 'PONG';
	}

	@Get('stats')
	stats(@Request() req: any) {
		return req.times;
	}

	@Get('endpoints')
	endpoints(): string[] {
		return this.modules;
	}
}

@Controller(ServerKind.Vanilla)
export class VanillaController {
	constructor(
		private readonly scrapperService: VanillaScrapperService,
		private readonly ChartsService: VanillaChartsService,
	) {}

	@Get('server/status')
	serverStatus(): boolean {
		return this.scrapperService.getServerState();
	}

	@Get('server/infos')
	serverInfos(): ResponseServerInfos {
		return this.scrapperService.getServerInfos();
	}

	@Get('players/online')
	playersOnline(): ResponsePlayersCurrentlyOnline[] {
		const players_sessions = this.scrapperService.getActivesSessions();
		if (!players_sessions) {
			return [];
		}

		return players_sessions.map((sessions) => {
			return { uuid: sessions.user.uuid, username: sessions.user.username };
		});
	}

	/**
	 * Charts
	 */

	@Get('charts/server/uptime')
	async uptime(): Promise<ResponseHistoryServerUptime[]> {
		return await this.ChartsService.uptime();
	}

	@Get('charts/players/max')
	async playersMax(): Promise<ResponseHistoryPlayersMaxOnline[]> {
		return await this.ChartsService.playersMax();
	}

	@Get('charts/players/history')
	async playersLogtimeHistory(): Promise<ResponseHistoryPlayersLogtimes[]> {
		return await this.ChartsService.playersLogtimeHistory();
	}
}

@Controller(ServerKind.Modded)
export class ModdedController {
	constructor(
		private readonly scrapperService: ModdedScrapperService,
		private readonly ChartsService: ModdedChartsService,
	) {}

	@Get('server/status')
	serverStatus(): boolean {
		return this.scrapperService.getServerState();
	}

	@Get('server/infos')
	serverInfos(): ResponseServerInfos {
		return this.scrapperService.getServerInfos();
	}

	@Get('players/online')
	playersOnline(): ResponsePlayersCurrentlyOnline[] {
		const players_sessions = this.scrapperService.getActivesSessions();
		if (!players_sessions) {
			return [];
		}

		return players_sessions.map((sessions) => {
			return { uuid: sessions.user.uuid, username: sessions.user.username };
		});
	}

	/**
	 * Charts
	 */

	@Get('charts/server/uptime')
	async uptime(): Promise<ResponseHistoryServerUptime[]> {
		return await this.ChartsService.uptime();
	}

	@Get('charts/players/max')
	async playersMax(): Promise<ResponseHistoryPlayersMaxOnline[]> {
		return await this.ChartsService.playersMax();
	}

	@Get('charts/players/history')
	async playersLogtimeHistory(): Promise<ResponseHistoryPlayersLogtimes[]> {
		return await this.ChartsService.playersLogtimeHistory();
	}
}
