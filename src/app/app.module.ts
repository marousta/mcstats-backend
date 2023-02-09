import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { AppController } from 'src/app/app.controller';

import { AppGateway } from 'src/app/app.gateway';

import { MojangUUID } from 'src/services/mojangUUID.service';

import { ResponseTimeMiddleware } from 'src/middlewares/time.middleware';

import moduleLoader from 'src/utils/module_loader';

const loader = moduleLoader();
const imports = loader.imports;
const controllers = [AppController, ...loader.controllers];
const providers = loader.providers;

@Module({
	imports: [
		HttpModule,
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		...imports,
	],
	controllers,
	providers: [MojangUUID, AppGateway, ...providers],
})
export class AppModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(ResponseTimeMiddleware)
			.exclude('/stats')
			.forRoutes(...controllers);
	}
}
