function getTime(option)
{
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

	if (option == "log")
		return ("[" + y + "-" + m + "-" + d  + " at " + hh + ":" + mm + ":" + ss + "] ");
	else
		return (hh + ":" + mm);
}

function error_log(text)
{
	console.log("%s#### ERROR ####%s", "\x1b[31m", "\x1b[0m");
	console.log("%s%s%s", "\x1b[33m", getTime("log"), "\x1b[0m");
	console.log(text);
	console.log("%s###############%s", "\x1b[31m", "\x1b[0m");
}

function warning_log(text)
{
	console.log("%s[WARNING]%s %s", "\x1b[33m", "\x1b[0m", text);
}

function info_log(text)
{
	console.log("%s[INFO]%s %s", "\x1b[32m", "\x1b[0m", text);
}

function sql_log(text)
{
	console.log("%s[SQL]%s %s", "\x1b[35m", "\x1b[0m", text);
}

function multisplit(string, array)
{
	let str = string;
	for (let i = 0; i < array.length; i++) {
		str = str.split(array[i]).join("");
	}
	return str;
}

function getTimestamp()
{
	return Math.floor((new Date().getTime() + (60 * 60 * 2)) / 1000);
}

function getTransID()
{
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	})
}

module.exports.log = {
	info: info_log,
	warning: warning_log,
	error: error_log,
	sql: sql_log,
}
module.exports.multisplit = multisplit;
module.exports.getTimestamp = getTimestamp;
module.exports.getTransID = getTransID;
