import { Injectable, Logger } from '@nestjs/common';

import { ScrapperVanillaService } from './scrapper.service';

@Injectable()
export class AppService {
	private readonly logger = new Logger(AppService.name);
	constructor(private readonly scrapperService: ScrapperVanillaService) {}

	serverStatus() {
		return this.scrapperService.getServerState();
	}

	playersOnline() {
		const players_sessions = this.scrapperService.getActivesSessions();
		if (!players_sessions) {
			return [];
		}

		return players_sessions.map((sessions) => sessions.user.username);
	}
}
