const logs	= require("./logs.js");
const utils	= require("./utils.js");

module.exports.sql = (response, errMessage = null) => {
	if (response.state === "success") {
		return response.content;
	}

	const message = utils.getFunctionAndLine();

	if (response.state === "partial") {
		logs.warning(`${message} ${response.message}`);
		return "empty";
	}
	logs.error(`${message} ${errMessage ? errMessage : "failed"} ${response.message ? "\n" + response.message : ""}`, false);
	return "error";
}
