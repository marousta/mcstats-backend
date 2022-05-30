const logs = require("./logs.js");

module.exports.multisplit = (string, array) => {
	let str = string;
	for (let i = 0; i < array.length; i++) {
		str = str.split(array[i]).join("");
	}
	return str;
}

module.exports.getTransID = () => {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	})
}

module.exports.extractJSON = (datas, index) => {
	if (index === undefined) {
		logs.error(["extractJSON", "undefined parameter index"]);
		process.exit();
	}

	let ret = [];
	for (const data of datas) {
		ret.push(data[index]);
	}
	return ret;
}

module.exports.stringifyArraySQL = (array, r1 = "\"", r2 = "\'") => {
	let json_array = JSON.stringify(array);
	return json_array.replaceAll(r1, r2);
}

module.exports.oneOfEachAs = (state, ...args) => {
	for (const arg of args) {
		if (arg === state) {
			return true;
		}
	}
	return false;
}

module.exports.getFunctionAndLine = (lvl = 3) => {
	const e = new Error();
    const frame = e.stack.split("\n")[lvl];
	const functinName = frame.split(" ")[5];
    let fileName = frame.split("(")[1].split(")")[0].replaceAll(" ", "\\ ").split(process.env.npm_package_name + "/")[1];
	if (fileName === undefined) {
		fileName = frame.split("(")[1].split(")")[0].replaceAll(" ", "\\ ");
	}
	return functinName + " " + fileName;
}
