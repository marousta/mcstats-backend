import { getTimestamp } from '$utils/time';

export function getTransID(): string
{
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c): string => {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	})
}

export function extractJSON(datas: Array<any>, index: string): Array<string | number>
{
	let ret: Array<string | number> = [];
	for (const data of datas) {
		ret.push(data[index]);
	}
	return ret;
}

export function stringifyArraySQL(array: Array<any>, r1 = "\"", r2 = "\'"): string
{
	let json_array: string = JSON.stringify(array);
	return json_array.replaceAll(r1, r2);
}

export function oneOfEachAs(state: string, ...args: Array<string> | Array<any>): boolean
{
	for (const arg of args) {
		if (arg === state) {
			return true;
		}
	}
	return false;
}

export function getFunctionAndLine(lvl: number = 3): string
{
	const e: any = new Error();
    const frame: string = e.stack.split("\n")[lvl];
	const functinName: string = frame.split(" ")[5];
    let fileName: string | undefined = frame.split("(")[1].split(")")[0].replaceAll(" ", "\\ ").split(process.env.npm_package_name + "/")[1];
	if (fileName === undefined) {
		fileName = frame.split("(")[1].split(")")[0].replaceAll(" ", "\\ ");
	}
	return functinName + " " + fileName;
}

export function calcLogtime(session: number, current: number): number
{
	const timestamp = getTimestamp();
	const logtime = timestamp - session + current;
	return logtime;
}
