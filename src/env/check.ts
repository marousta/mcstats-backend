import ValidateEnv from './validate';

export default function () {
	const env = new ValidateEnv();
	const vanilla = new ValidateEnv();
	const modded = new ValidateEnv();

	env.check('USER_AGENT', 'string');
	vanilla.check('MC_HOST', 'string');
	vanilla.check('MC_QUERY_PORT', 0);
	vanilla.check('MC_RCON_PORT', 0);
	vanilla.check('MC_RCON_PASSWORD', 'string');
	modded.check('MC_MOD_HOST', 'string');
	modded.check('MC_MOD_QUERY_PORT', 0);
	modded.check('MC_MOD_RCON_PORT', 0);
	modded.check('MC_MOD_RCON_PASSWORD', 'string');
	env.check('PSQL_HOST', 'string');
	env.check('PSQL_PORT', 0);
	env.check('PSQL_USERNAME', 'string');
	env.check('PSQL_PASSWORD', 'string');
	env.check('PSQL_DATABASE', 'string');
	env.check('PSQL_SYNC', false);

	if ((vanilla.getErrorState() && modded.getErrorState()) || env.getErrorState()) {
		vanilla.printErrorMessage();
		modded.printErrorMessage();
		env.printErrorMessage();
		process.exit(1);
	}
}
