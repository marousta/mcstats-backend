import { Client, Guild, GuildMember, Intents, TextChannel } from 'discord.js';

import { env } from '$env';
import { ErrorResponse, SuccessResponse, PartialResponse } from '$types';

const discord_bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] });

let guild: Guild | null = null;
let pingUser: GuildMember | null = null;
let channel: TextChannel | null = null;
let last: string | null = null;

export async function setPingUser(): Promise<SuccessResponse | ErrorResponse>
{
	if (!guild) {
		return {
			state: "error",
			message: "guild not set yet",
		};
	}
	let members = await guild.members.fetch();
	pingUser = members.map(u => u.user.tag === env.discordUser ? u : null)[0];
	if (pingUser === undefined) {
		return {
			state: "error",
			message: "Discord user " + env.discordUser + " not found",
		};
	}
	return { state: "success" };
}
export async function setChannel(): Promise<SuccessResponse | ErrorResponse>
{
	if (!guild) {
		return {
			state: "error",
			message: "guild not set yet",
		};
	}
	const channels = await guild.channels.fetch();
	const filtered = channels.filter((c) => c.type === "GUILD_TEXT");
	const formated = [...filtered.values()];
	const tmp = formated.filter(c => c.name === env.discordChannel ? discord_bot.channels.cache.get(c.id) : null);
	if (tmp === undefined) {
		return {
			state: "error",
			message: "Discord channel " + env.discordChannel + " not found",
		};
	}
	channel = tmp[0] as TextChannel;
	return { state: "success" };
}
export async function init(): Promise<SuccessResponse | ErrorResponse>
{
	let ret: Promise<SuccessResponse | ErrorResponse> = new Promise((resolve) => {
		discord_bot.on('ready', async() => {
			const guildsArray = discord_bot.guilds.cache.map(guild => guild.id);
			guild = await discord_bot.guilds.fetch(guildsArray[0]);
			resolve({ state: "success" });
		});

		discord_bot.on("error", (e) => {
			resolve({
				state: "error",
				message: e.message
			});
		});
	});

	discord_bot.login(env.discordToken);
	return await ret;
}
export async function test(): Promise<SuccessResponse | ErrorResponse>
{
	if (!channel) {
		return {
			state: "error",
			message: "channel not set yet",
		};
	}
	return await channel.send(`${pingUser} initialized`)
							.then(msg => {
								setTimeout(() => msg.delete(), 500);
								return { state: "success" };
							})
							.catch((e: any) => {
								return {
									state: "error",
									message: e.message,
								};
							}) as SuccessResponse | ErrorResponse;
}
export async function send(message: string): Promise<SuccessResponse | PartialResponse | ErrorResponse>
{
	if (channel === null || pingUser === null) {
		return {
			state: "error",
			message: `Failed to mirror error to discord. debug: [channel ${typeof channel}] [pingUser ${typeof pingUser}]`,
		};
	}
	if (last === message) {
		return {
			state: "partial",
			message: "current message is identical to previous",
		};
	}
	last = message;
	return await channel.send(`
							${pingUser}
							\`\`\`CS\n${message}\`\`\`
						`).then(() => {
							return { state: "success" };
						})
						.catch((e: any) => {
							return {
								state: "error",
								message: e.message,
							};
						}) as SuccessResponse | ErrorResponse;
}
