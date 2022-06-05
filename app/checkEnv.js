const fs = require('fs');

const { error } = require("./server/utils/logs.js");

let missing = false;

function check(variable)
{
	if (process.env[variable] === undefined
	|| process.env[variable] === "") {
		error(`env "${variable}" is missing`, false);
		missing = true;
	}
}

check("websocketPort");
check("minecraftHost");
check("minecraftQueryPort");
check("queryRetry");
check("postgresHost");
check("postgresPort");
check("postgresUser");
check("postgresPassword");
check("postgresDatabase");

if (missing === true) {
	if (fs.existsSync(".env") === false) {
		console.log(".env file not found create it with .env.template");
	}
	process.exit(1);
}
