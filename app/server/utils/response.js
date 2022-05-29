const logs = require("./logs.js");

module.exports = (response, errMessage = null) => {
	if (response.state === "success") {
		return response.content;
	}

    const e = new Error();
    const frame = e.stack.split("\n")[2];
    const lineNumber = frame.split(":").reverse()[1];
    const functionName = frame.split(" ")[5];
	const message = `${functionName}:${lineNumber}`;

	if (response.state === "partial") {
		logs.warning(`${message} ${response.message}`);
		return "empty";
	}
	logs.error(`${message} ${errMessage ? errMessage : "failed"} ${response.message ? "\n" + response.message : ""}`);
	return "error";
}
