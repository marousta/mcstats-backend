import { Controller, Get, Param } from '@nestjs/common';
import { get } from 'http';
import { AppService } from './services/app.service';

@Controller()
export class AppController {
	constructor() {}

	@Get('ping')
	ping() {
		return 'PONG';
	}

	@Get('server/status')
	serverStatus() {}

	@Get('players/online')
	playersOnline() {}
}

@Controller('charts/vanilla')
export class ChartsVanillaController {
	constructor(private readonly appService: AppService) {}

	@Get('server/uptime')
	uptime() {}

	@Get('players/max')
	playersMax() {}

	@Get('players/logtime')
	playersLogtime() {}

	@Get('players/history')
	playersLogtimeHistory() {}
}

@Controller('charts/modded')
export class ChartsModdedController {
	constructor(private readonly appService: AppService) {}

	@Get('server/uptime')
	uptime() {}

	@Get('players/max')
	playersMax() {}

	@Get('players/logtime')
	playersLogtime() {}

	@Get('players/history')
	playersLogtimeHistory() {}
}
