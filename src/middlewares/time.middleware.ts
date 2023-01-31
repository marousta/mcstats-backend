import { Injectable, NestMiddleware } from '@nestjs/common';

import * as responseTime from 'response-time';

@Injectable()
export class ResponseTimeMiddleware implements NestMiddleware {
	private times: number[] = [];
	private nbr: number = 0;

	private calcAverage() {
		let total = 0;
		const length = this.times.length;
		this.times.forEach((t) => (total += t));
		return total / length;
	}

	private getTimes() {
		return {
			count: this.nbr,
			average: this.calcAverage() || -1,
			last: this.times[this.times.length - 1] || -1,
		};
	}

	use(req: any, res: any, next: any) {
		// Exclude from api speed counter
		// if (req.params[0] === 'api/avatar') {
		// 	next();
		// 	return;
		// }

		// Set times in request object for accessing api speed counter in controller function
		if (req.originalUrl === '/api/stats') {
			req['times'] = this.getTimes();
			next();
			return;
		}
		responseTime((req, res, time) => {
			this.times.push(time);
			this.nbr++;

			if (this.times.length > 1000) {
				this.times.shift();
			}
		})(req, res, next);
	}
}
