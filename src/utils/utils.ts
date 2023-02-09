import { getTimestamp } from 'src/utils/time';

export function calcLogtime(session: number, current: number): number {
	const timestamp = getTimestamp();
	const logtime = timestamp - session + current;
	return logtime;
}
