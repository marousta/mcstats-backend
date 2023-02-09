export interface MigrationTableKey {
	name: string;
	entity: any;
	convert: {
		[key: string]: (params: any) => Promise<any>;
	};
	translate: {
		[key: string]: string;
	};
}

export interface MigrationTable {
	[key: string]: MigrationTableKey;
}

export interface TranslationTable {
	[key: string]: string;
}
