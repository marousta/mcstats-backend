import { Controller, Get, Request } from '@nestjs/common';

import { AppService } from 'src/services/app.service';
import { ChartsModdedService, ChartsVanillaService } from 'src/services/charts.service';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get('ping')
	ping() {
		return 'PONG';
	}

	@Get('stats')
	stats(@Request() req: any) {
		return req.times;
	}

	@Get('server/status')
	serverStatus() {
		return this.appService.serverStatus();
	}

	@Get('players/online')
	playersOnline() {
		return this.appService.playersOnline();
	}
}

@Controller('charts/vanilla')
export class ChartsVanillaController {
	constructor(private readonly ChartsService: ChartsVanillaService) {}

	@Get('server/uptime')
	async uptime() {
		return await this.ChartsService.uptime();
	}

	@Get('players/max')
	async playersMax() {
		return await this.ChartsService.playersMax();
	}

	@Get('players/history')
	async playersLogtimeHistory() {
		return await this.ChartsService.playersLogtimeHistory();
	}
}

@Controller('charts/modded')
export class ChartsModdedController {
	constructor(private readonly ChartsService: ChartsModdedService) {}

	@Get('server/uptime')
	async uptime() {
		return await this.ChartsService.uptime();
	}

	@Get('players/max')
	async playersMax() {
		return await this.ChartsService.playersMax();
	}

	@Get('players/history')
	async playersLogtimeHistory() {
		return await this.ChartsService.playersLogtimeHistory();
	}
}
