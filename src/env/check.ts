import ValidateEnv from './validate';

export default function () {
	const env = new ValidateEnv();
	env.check('WEBSOCKET_PORT', 0);
	env.check('USER_AGENT', 'string');
	env.check('MC_HOST', 'string');
	env.check('MC_QUERY_PORT', 0);
	env.check('MC_RCON_PORT', 0);
	env.check('MC_RCON_PASSWORD', 'string');
	env.check('PSQL_HOST', 'string');
	env.check('PSQL_PORT', 0);
	env.check('PSQL_USERNAME', 'string');
	env.check('PSQL_PASSWORD', 'string');
	env.check('PSQL_DATABASE', 'string');
	env.check('PSQL_SYNC', false);
	env.result();
}
