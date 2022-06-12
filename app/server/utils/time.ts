import { Idate } from '$types';

export function getTime(option: string | undefined = undefined): string
{
	const date: Date = new Date();
	const value: Idate = {
		y:  date.getFullYear(),
		m:  date.getMonth() + 1,
		d:  date.getDate(),
		hh: date.getHours(),
		mm: date.getMinutes(),
		ss: date.getSeconds(),
	};
	let format = {
		y:  value.y.toString(),
		m:  value.m.toString(),
		d:  value.d.toString(),
		hh: value.hh.toString(),
		mm: value.mm.toString(),
		ss: value.ss.toString(),
	}

	value.m  < 10 ? format.m  = "0" + format.m : 0;
	value.d  < 10 ? format.d  = "0" + format.d : 0;
	value.hh < 10 ? format.hh = "0" + format.hh : 0;
	value.mm < 10 ? format.mm = "0" + format.mm : 0;
	value.ss < 10 ? format.ss = "0" + format.ss : 0;

	switch (option)
	{
		case "log"	: return `${format.y}-${format.m}-${format.d} ${format.hh}:${format.mm}:${format.ss}`;
		default		: return `${format.hh}:${format.mm}`;
	}
}

export function getTimestamp(): number
{
	return Math.floor((new Date().getTime() + (60 * 60 * 2)) / 1000);
}

export class getDate {
	time: number;
	d: Date;
	months: Array<string> = [
		"January",
		"Febuary",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	date: Idate;
	format = {
		time: () => {
			let meridiem = Math.floor(this.date.hh % 12);
			if (meridiem === 0) {
				meridiem = 12;
			}
			return (this.date.hh == 0 ? "12" : meridiem) + ":" + (this.date.mm < 10 ? "0" + this.date.mm : this.date.mm);
		},
		meridiem: () => {
			return (this.date.hh > 12 ? "pm" : (this.date.hh == 0 ? "pm" : "am"));
		}
	};

	constructor (timestamp: number | string)
	{
		if (typeof(timestamp) === "number") {
			this.time = timestamp;
			this.d = new Date(timestamp * 1000);
		} else {
			this.d = new Date(timestamp);
			this.time = this.d.getTime();
		}
		this.date = {
			y: this.d.getFullYear(),
			m: this.d.getMonth(),
			d: this.d.getDate(),
			hh: this.d.getHours(),
			mm: this.d.getMinutes(),
			ss: this.d.getSeconds(),
		};
	}

	full(): string
	{
		return this.date.d + " " + this.months[this.date.m] + " " + this.date.y + " - " + this.format.time() + this.format.meridiem();
	}

	lite(): string
	{
		return this.date.d + " " + this.months[this.date.m] + " " + this.date.y;
	}

	half(): string
	{
		return this.format.time() + this.format.meridiem();
	}

	logtime(): string
	{
		let t = {
			ss: Math.floor(this.time % 60),
			mm: Math.floor(this.time / 60 % 60),
			hh: Math.floor(this.time / 60 / 60 % 24),
			d: Math.floor(this.time / 60 / 60 / 24),
		};

		let ret = "";
		t.d ? ret += t.d + (t.d > 1 ? " days " : " day ") : 0;
		t.hh ? ret += t.hh + "h" : 0;
		t.mm ? ret += (t.mm < 10 ? "0" + t.mm : t.mm) + "m" : 0;
		t.ss ? ret += (t.ss < 10 ? "0" + t.ss : t.ss) + "s": 0;

		if (ret == "") {
			ret = "00s";
		}
		return ret;
	}
}
