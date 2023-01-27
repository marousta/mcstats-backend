import { Controller, Get, Param } from '@nestjs/common';
import { get } from 'http';
import { AppService } from './app.service';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get('ping')
	ping() {
		return 'PONG';
	}

	@Get('charts/:version/:kind')
	charts(@Param('version') version: string, @Param('kind') kind: string) {}
}
