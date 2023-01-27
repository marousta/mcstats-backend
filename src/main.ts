import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';

import { AppModule } from './app.module';
import { ValidateEnv } from './validateEnv';

async function bootstrap() {
	const env = new ValidateEnv();
	env.check('PSQL_HOST', 'string');
	env.check('PSQL_PORT', 0);
	env.check('PSQL_USERNAME', 'string');
	env.check('PSQL_PASSWORD', 'string');
	env.check('PSQL_DATABASE', 'string');
	env.check('PSQL_SYNC', false);
	env.result();

	const app = await NestFactory.create(AppModule);

	app.enableCors();
	app.setGlobalPrefix('api');

	app.useWebSocketAdapter(new WsAdapter(app));

	await app.listen(3000);
}
bootstrap();
