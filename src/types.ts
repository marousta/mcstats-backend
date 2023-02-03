/**
 * Generic
 */

export interface Response {
	success: boolean;
	data?: any;
}

export interface ResponseSuccess extends Response {
	success: true;
}

export interface ResponseFailure extends Response {
	success: false;
}

/**
 * PlayerDB
 */

export interface PlayerDBMinecraftDefault {
	code?: string;
	message?: string;
	data?: {
		player: {
			meta: {
				cached_at: number;
			};
			username: string;
			id: string;
			raw_id: string;
			avatar: string;
			name_history: string[];
		};
	};
	success: boolean;
}

export interface PlayerDBMinecraftSuccess extends PlayerDBMinecraftDefault {
	code: string;
	message: string;
	data: {
		player: {
			meta: {
				cached_at: number;
			};
			username: string;
			id: string;
			raw_id: string;
			avatar: string;
			name_history: string[];
		};
	};
	success: true;
}

export interface PlayerDBMinecraftFailure extends PlayerDBMinecraftDefault {
	code: string;
	message: string;
	success: false;
}

export interface PlayerDBMinecraftFailover extends PlayerDBMinecraftDefault {
	success: false;
}

/**
 *
 */

export enum ServerKind {
	Vanilla,
	Modded,
}
