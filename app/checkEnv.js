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

check("port");
check("execPath");
check("serverURL");
check("postgresUser");
check("postgresPassword");
check("postgresHost");
check("postgresDatabase");
check("postgresOptions");

if (missing === true) {
	process.exit(1);
}
