import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { ModdedController, VanillaController } from 'src/app/app.controller';

import { VanillaDBService, ModdedDBService } from '../database/implemtations.service';
import { ModdedScrapperService, VanillaScrapperService } from '../services/scrapper.service';
import { ModdedChartsService, VanillaChartsService } from 'src/services/charts.service';

import { HistoryPlayersLogtime } from 'src/entities/history/logtime.entity';
import { HistoryPlayersOnline } from 'src/entities/history/online.entity';
import { PlayersLogtime } from 'src/entities/players/logtime.entity';
import { PlayersSessions } from 'src/entities/players/sessions.entity';
import { ServerUptime } from 'src/entities/server_uptime.entity';

import { ServerKind } from 'src/types';

function typeorm(schema: string) {
	return [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			name: schema,
			useFactory: (configService: ConfigService): any => ({
				type: 'postgres',
				host: configService.get<string>('PSQL_HOST'),
				port: configService.get<number>('PSQL_PORT'),
				username: configService.get<string>('PSQL_USERNAME'),
				password: configService.get<string>('PSQL_PASSWORD'),
				database: configService.get<string>('PSQL_DATABASE'),
				entities: ['dist/**/*.entity{.ts,.js}'],
				synchronize: configService.get<boolean>('PSQL_SYNC'),
				namingStrategy: new SnakeNamingStrategy(),
				logging: false,
				schema,
			}),
		}),
		TypeOrmModule.forFeature(
			[
				HistoryPlayersLogtime,
				HistoryPlayersOnline,
				PlayersLogtime,
				PlayersSessions,
				ServerUptime,
			],
			schema,
		),
	];
}

export default function (): {
	imports: Array<any>;
	providers: Array<any>;
	controllers: Array<any>;
} {
	const logger = new Logger('moduleLoader');

	const config = new ConfigService();

	const imports: Array<any> = [];
	const providers: Array<any> = [];
	const controllers: Array<any> = [];

	const MC_HOST = config.get<string>('MC_HOST');
	const MC_QUERY_PORT = config.get<string>('MC_QUERY_PORT');
	const MC_RCON_PORT = config.get<string>('MC_RCON_PORT');
	const MC_MOD_HOST = config.get<string>('MC_MOD_HOST');
	const MC_MOD_QUERY_PORT = config.get<string>('MC_MOD_QUERY_PORT');
	const MC_MOD_RCON_PORT = config.get<string>('MC_MOD_RCON_PORT');
	const MC_BEDROCK_HOST = config.get<string>('MC_BEDROCK_HOST');
	const MC_BEDROCK_PORT = config.get<string>('MC_BEDROCK_PORT');

	if ((MC_HOST && MC_QUERY_PORT && MC_RCON_PORT) || (MC_BEDROCK_HOST && MC_BEDROCK_PORT)) {
		imports.push(...typeorm(ServerKind.Vanilla));
		controllers.push(VanillaController);
		providers.push(VanillaDBService);
		providers.push(VanillaScrapperService);
		providers.push(VanillaChartsService);
	}
	if (MC_MOD_HOST && MC_MOD_QUERY_PORT && MC_MOD_RCON_PORT) {
		imports.push(...typeorm(ServerKind.Modded));
		controllers.push(ModdedController);
		providers.push(ModdedDBService);
		providers.push(ModdedScrapperService);
		providers.push(ModdedChartsService);
	}

	if (!controllers.length) {
		logger.error(`No module available`);
		process.exit(1);
	}

	return {
		imports,
		providers,
		controllers,
	};
}
