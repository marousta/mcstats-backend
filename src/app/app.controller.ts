import { Controller, Get, Request } from '@nestjs/common';

import { ChartsModdedService, ChartsVanillaService } from 'src/services/charts.service';
import { ScrapperModdedService, ScrapperVanillaService } from 'src/services/scrapper.service';
import {
	ResponseHistoryPlayersLogtimes,
	ResponseHistoryPlayersMaxOnline,
	ResponseHistoryServerUptime,
	ResponseServerInfos,
} from 'src/services/types';

import controllerLoader from 'src/utils/controllers_loader';

@Controller()
export class AppController {
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
		const controllers = controllerLoader();
		return controllers.map((entry: any) =>
			(entry.name as string).replace('Controller', '').toLowerCase(),
		);
	}
}

@Controller('vanilla')
export class VanillaController {
	constructor(
		private readonly scrapperService: ScrapperVanillaService,
		private readonly ChartsService: ChartsVanillaService,
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
	playersOnline(): string[] {
		const players_sessions = this.scrapperService.getActivesSessions();
		if (!players_sessions) {
			return [];
		}

		return players_sessions.map((sessions) => sessions.user.username);
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

@Controller('modded')
export class ModdedController {
	constructor(
		private readonly scrapperService: ScrapperModdedService,
		private readonly ChartsService: ChartsModdedService,
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
	playersOnline(): string[] {
		const players_sessions = this.scrapperService.getActivesSessions();
		if (!players_sessions) {
			return [];
		}

		return players_sessions.map((sessions) => sessions.user.username);
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
