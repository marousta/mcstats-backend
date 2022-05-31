const config				= require("../../config.js");
const { Client, Intents }	= require('discord.js');

const discord_bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] });

let guild = null;
let pingUser = null;
let channel = null;

module.exports.setPingUser = async() => {
	let members = await guild.members.fetch();
	pingUser = members.map(u => u.user.tag === config.discord.user ? u : null)[0];
	if (pingUser === undefined) {
		return {
			state: "error",
			message: "Discord user " + config.discord.user + " not found",
		};
	}
	return { state: "success" };
}

module.exports.setChannel = async() => {
	let channels = await guild.channels.fetch();
	channels = channels.filter((c) => c.type === "GUILD_TEXT");
	channels = [...channels.values()];
	channel = channels.filter(c => c.name === config.discord.channel ? discord_bot.channels.cache.get(c.id) : null)[0];
	if (channel === undefined) {
		return {
			state: "error",
			message: "Discord channel " + config.discord.channel + " not found",
		};
	}
	return { state: "success" };
}

module.exports.init = async() => {

	let ret = new Promise((resolve) => {
		discord_bot.on('ready', async() => {
			const guildsArray = discord_bot.guilds.cache.map(guild => guild.id);
			guild = await discord_bot.guilds.fetch(guildsArray[0]);
			resolve({ state: "success" });
		});

		discord_bot.on("error", (e) => {
			resolve({ state: "error", message: e });
		});
	});

	discord_bot.login(config.discord.token);
	return await ret;
}

module.exports.test = async() => {
	let ret = await channel.send(`${pingUser} initialized`)
		.then(msg => {
			setTimeout(() => msg.delete(), 500);
			return { state: "true" };
		})
		.catch(e => {
			return { state: "error", message: e };
		});
	return ret;
}

module.exports.send = async(message) => {
	if (channel === null || pingUser === null) {
		return;
	}
	return await channel.send(`
		${pingUser}
		\`\`\`${message}\`\`\`
	`);
}
