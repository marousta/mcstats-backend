// @ts-nocheck
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { AppController } from './app.controller';
import { AppService } from './services/app.service';
import { DBService } from './services/db.service';
import { AppGateway } from './app.gateway';

import { HistoryPlayersLogtime } from './entities/history/history_players_logtime.entity';
import { PlayersLogtime } from './entities/players/players_logtime.entity';
import { HistoryPlayersOnline } from './entities/history_players_online.entity';
import { PlayersSessions } from './entities/players_sessions.entity';
import { ServerUptime } from './entities/server_uptime.entity';

import { controllerLoader } from './utils/controllersLoader';

@Module({
	imports: [
		HttpModule,
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
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
				migrations: ['dist/database-migration/*{.ts,.js}'],
				logging: true,
			}),
		}),
		TypeOrmModule.forFeature([
			HistoryPlayersLogtime,
			PlayersLogtime,
			HistoryPlayersOnline,
			PlayersSessions,
			ServerUptime,
		]),
	],
	controllers: [AppController, ...controllerLoader()],
	providers: [AppService, DBService, AppGateway],
})
export class AppModule {}
