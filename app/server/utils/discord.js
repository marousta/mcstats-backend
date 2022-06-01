const { Client, Intents }	= require('discord.js');

const discord_bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] });

let guild = null;
let pingUser = null;
let channel = null;
let last = null;

module.exports.setPingUser = async() => {
	let members = await guild.members.fetch();
	pingUser = members.map(u => u.user.tag === process.env.discordUser ? u : null)[0];
	if (pingUser === undefined) {
		return {
			state: "error",
			message: "Discord user " + process.env.discordUser + " not found",
		};
	}
	return { state: "success" };
}

module.exports.setChannel = async() => {
	let channels = await guild.channels.fetch();
	channels = channels.filter((c) => c.type === "GUILD_TEXT");
	channels = [...channels.values()];
	channel = channels.filter(c => c.name === process.env.discordChannel ? discord_bot.channels.cache.get(c.id) : null)[0];
	if (channel === undefined) {
		return {
			state: "error",
			message: "Discord channel " + process.env.discordChannel + " not found",
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

	discord_bot.login(process.env.discordToken);
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
	if (channel === null || pingUser === null || last === message) {
		return;
	}
	last = message;
	return await channel.send(`
		${pingUser}
		\`\`\`CS\n${message}\`\`\`
	`).then(msg => { return { state: "true" }; })
	.catch(e => { console.log(e); return { state: "error" }; });
}
