import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { MojangUUID } from 'src/services/mojangUUID.service';

import moduleLoader from 'src/utils/module_loader';
import { AppGateway } from '../app/app.gateway';

const loader = moduleLoader();

const imports = loader.imports;
const providers = loader.providers.filter((service) => !service.name.includes('Charts'));

@Module({
	imports: [
		HttpModule,
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		...imports,
	],
	providers: [MojangUUID, AppGateway, ...providers],
})
export class CLIModule {}
