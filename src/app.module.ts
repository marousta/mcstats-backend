import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './app.gateway';

import { LogtimeHistory } from './entities/logtime_history.entity';
import { LogtimePlayers } from './entities/logtime_players.entity';
import { PlayersOnline } from './entities/players_online.entity';
import { ServerUptime } from './entities/server_uptime.entity';

@Module({
	imports: [
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
				logging: false,
			}),
		}),
		TypeOrmModule.forFeature([LogtimeHistory, LogtimePlayers, PlayersOnline, ServerUptime]),
	],
	controllers: [AppController],
	providers: [AppService, AppGateway],
})
export class AppModule {}
