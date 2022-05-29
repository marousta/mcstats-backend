const logs = require("./logs.js");

module.exports = (response, errMessage = null) => {
	if (response.state === "success") {
		return response.content;
	}

    const e = new Error();
    const frame = e.stack.split("\n")[2];
    const lineNumber = frame.split(":").reverse()[1];
    const functionName = frame.split(" ")[5];
	const message = `${functionName}:${lineNumber} ${errMessage ? errMessage : "failed"}`;

	if (response.state === "partial") {
		logs.logWarning(message);
		return "empty";
	}
	logs.logError(message);
	return "error";
}
