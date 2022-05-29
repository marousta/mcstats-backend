module.exports.getTime = (option) => {
	let date = new Date(),
		y = date.getFullYear(),
		m = date.getMonth() + 1,
		d = date.getDate(),
		hh = date.getHours(),
		mm = date.getMinutes(),
		ss = date.getSeconds();

	m < 10 ? m = "0" + m : 0;
	d < 10 ? d = "0" + d : 0;
	hh < 10 ? hh = "0" + hh : 0;
	mm < 10 ? mm = "0" + mm : 0;
	ss < 10 ? ss = "0" + ss : 0;

	switch (option)
	{
		case "log"	: return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
		default		: return `${hh}:${mm}`;
	}
}

module.exports.getTimestamp = () => {
	return Math.floor((new Date().getTime() + (60 * 60 * 2)) / 1000);
}
