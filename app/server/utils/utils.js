const log = require("./logs.js");

function multisplit(string, array)
{
	let str = string;
	for (let i = 0; i < array.length; i++) {
		str = str.split(array[i]).join("");
	}
	return str;
}

function getTransID()
{
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	})
}

function extractJSON(datas, index)
{
	let ret = [];
	for (const data of datas) {
		ret.push(data[index]);
	}
	return ret;
}

function stringifyArraySQL(array, r1 = "\"", r2 = "\'")
{
	let json_array = JSON.stringify(array);
	return json_array.replaceAll(r1, r2);
}

module.exports.multisplit = multisplit;
module.exports.getTransID = getTransID;
module.exports.extractJSON = extractJSON;
module.exports.stringifyArraySQL = stringifyArraySQL;
