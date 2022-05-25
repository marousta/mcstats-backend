module.exports.execPath = "../mc-ping-json/target/release/shalyuping"


//Postresql database config
const pg = {
	user:		"postgres",
	password:	"",
	ip:			"127.0.0.1:5432",
	database:	"mcstats",
	options:	"client_encoding=UTF8"
}
module.exports.psql = "postgresql://" + pg.user + ":" + pg.password + "@" + pg.ip + "/" + pg.database + "?" + pg.options
