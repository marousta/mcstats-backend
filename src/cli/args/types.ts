import { ServerKind } from 'src/types';

export interface ArgsHelp {
	exec: 'help';
}

export interface ArgsMigrate {
	exec: 'migrate';
	dryrun: boolean;
	kind: ServerKind;
	filename: string;
}

export enum SaveTarget {
	Logtime = 'logtimes',
}

export interface ArgsSave {
	exec: 'save';
	kind: ServerKind;
	target: SaveTarget;
}
