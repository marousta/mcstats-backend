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
check("postgresHost");
check("postgresUser");
check("postgresPassword");
check("postgresDatabase");
check("postgresOptions");

if (missing === true) {
	process.exit(1);
}
