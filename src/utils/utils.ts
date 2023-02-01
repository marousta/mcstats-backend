import * as time from 'src/utils/time';

export function calcLogtime(session: number, current: number): number {
	const timestamp = time.getTimestamp();
	const logtime = timestamp - session + current;
	return logtime;
}
