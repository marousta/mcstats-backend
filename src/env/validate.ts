import { Logger } from '@nestjs/common';

export default class {
	private readonly logger = new Logger('validateEnv');
	private errors: string[] = [];
	private error = false;

	private checkProtocol(protocol: string) {
		return protocol === 'http' || protocol == 'https';
	}

	private exist(variable: string): string | null {
		const value: string | undefined = process.env[variable];

		if (!value || value === '') {
			this.errors.push('env ' + variable + ' is missing.');
			this.error = true;
			return null;
		}
		return value;
	}

	private readonly checks = {
		protocol: (variable: string, value: string) => {
			if (variable === 'PROTOCOL' && !this.checkProtocol(value)) {
				this.errors.push(
					'Invalid ' + variable + ', expected http or https, got ' + value + '.',
				);
				this.error = true;
				return false;
			}
			return true;
		},
		port: (variable: string, value: string) => {
			if (variable === 'PORT' && !this.checkProtocol(value)) {
				this.errors.push(
					'Invalid ' +
						variable +
						', expected value between 1 and 65,535, got ' +
						value +
						'.',
				);
				this.error = true;
				return false;
			}
			return true;
		},
		nan: (variable: string, value: string) => {
			if (isNaN(parseInt(value))) {
				this.errors.push(variable + ' should be a number.');
				this.error = true;
				return false;
			}
			return true;
		},
		boolean: (variable: string, value: string) => {
			if (value !== 'true' && value !== 'false') {
				this.errors.push(variable + ' should be a boolean.');
				this.error = true;
				return false;
			}
			return true;
		},
	};

	check(variable: string, type: any) {
		const value = this.exist(variable);
		if (!value) {
			return false;
		}

		switch (typeof type) {
			case 'string':
				return this.checks.protocol(variable, value);
			case 'number':
				return this.checks.nan(variable, value) || this.checks.port(variable, value);
			case 'boolean':
				return this.checks.boolean(variable, value);
			default:
				this.errors.push(variable + ' type is unknown.');
				this.error = true;
				return false;
		}
		return true;
	}

	getErrorState() {
		return this.error;
	}

	printErrorMessage() {
		this.errors.forEach((error) => {
			this.logger.error(error);
		});
	}
}
