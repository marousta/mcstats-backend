// @ts-nocheck
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { AppController } from 'src/app/app.controller';

import { AppGateway } from 'src/app/app.gateway';

import { AppService } from 'src/services/app.service';
import { ScrapperService } from 'src/services/scrapper.service';
import { JavaDBService } from 'src/database/implemtations.service';
import { ChartsService } from '../services/charts.service';

import { ResponseTimeMiddleware } from 'src/middlewares/time.middleware';

import { HistoryPlayersOnline } from 'src/entities/history/online.entity';
import { HistoryPlayersLogtime } from 'src/entities/history/logtime.entity';
import { PlayersSessions } from 'src/entities/players/sessions.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';
import { ServerUptime } from 'src/entities/server_uptime.entity';

import { controllerLoader } from 'src/utils/controllers_loader';

const controllers = [AppController, ...controllerLoader()];

function typeorm($schema) {
	return [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			name: $schema,
			useFactory: (configService: ConfigService) => ({
				type: 'postgres',
				host: configService.get<string>('PSQL_HOST'),
				port: configService.get<number>('PSQL_PORT'),
				username: configService.get<string>('PSQL_USERNAME'),
				password: configService.get<string>('PSQL_PASSWORD'),
				database: configService.get<string>('PSQL_DATABASE'),
				entities: ['dist/**/*.entity{.ts,.js}'],
				synchronize: configService.get<boolean>('PSQL_SYNC'),
				namingStrategy: new SnakeNamingStrategy(),
				logging: true,
				schema: $schema,
			}),
		}),
		TypeOrmModule.forFeature(
			[
				HistoryPlayersLogtime,
				PlayersLogtime,
				HistoryPlayersOnline,
				PlayersSessions,
				ServerUptime,
			],
			$schema,
		),
	];
}

@Module({
	imports: [
		HttpModule,
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		...typeorm('java'),
		...typeorm('bedrock'),
		...typeorm('modded'),
	],
	controllers,
	providers: [AppService, JavaDBService, ScrapperService, ChartsService, AppGateway],
})
export class AppModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(ResponseTimeMiddleware)
			.exclude('/stats')
			.forRoutes(...controllers);
	}
}
