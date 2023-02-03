#!/bin/bash
#
# TypeORM doesn't support database and schena creation
#

function PSQL {
	if [ $# -eq 1 ]; then
		psql postgresql://$PSQL_USERNAME:$PSQL_PASSWORD@$PSQL_HOST:$PSQL_PORT -c "$1" 1>&/dev/null
	else
		psql postgresql://$PSQL_USERNAME:$PSQL_PASSWORD@$PSQL_HOST:$PSQL_PORT/$1 -c "$2" 1>&/dev/null
	fi

	if [ $? -eq 0 ]; then
		echo OK;
	fi
}

exist=$(PSQL "SELECT datname FROM pg_database WHERE datname = '$PSQL_DATABASE';" | wc -l)

if [ $exist -eq 6 ]; then
	echo OK;
else
	PSQL "CREATE DATABASE $PSQL_DATABASE;"
fi

PSQL $PSQL_DATABASE "CREATE SCHEMA IF NOT EXISTS vanilla;"
PSQL $PSQL_DATABASE "CREATE SCHEMA IF NOT EXISTS modded;"
