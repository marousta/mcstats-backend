import { Controller, Get, Request } from '@nestjs/common';
import { AppService } from '../services/app.service';

@Controller()
export class AppController {
	constructor() {}

	@Get('ping')
	ping() {
		return 'PONG';
	}

	@Get('stats')
	stats(@Request() req: any) {
		console.log(req.times);
		return req.times;
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
