const config				= require("../../config.js");
const { Client, Intents }	= require('discord.js');

const discord_bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] });
let pingUser = null;
let chan = null;

discord_bot.on('ready', async() => {
	const logs = require("./logs.js");
	logs.discord("Logged");

	const guildsArray = discord_bot.guilds.cache.map(guild => guild.id);
	const guild = await discord_bot.guilds.fetch(guildsArray[0]);

	let members = await guild.members.fetch();
	pingUser = members.map(u => u.user.tag === config.discord.user ? u : null)[0];
	if (pingUser === undefined) {
		logs.fatal("Discord user " + config.discord.user + " not found");
	}

	let channels = await guild.channels.fetch();
	channels = channels.filter((c) => c.type === "GUILD_TEXT");
	channels = [...channels.values()];
	chan = channels.filter(c => c.name === config.discord.channel ? discord_bot.channels.cache.get(c.id) : null)[0];
	if (chan === undefined) {
		logs.fatal("Discord channel " + config.discord.channel + " not found");
	}
	logs.discord("Ready");
});

discord_bot.login(config.discord.token);

module.exports = async(message) => {
	if (chan === null) {
		return;
	}
	return await chan.send(`
		${pingUser}
		\`\`\`${message}\`\`\`
	`);
};
