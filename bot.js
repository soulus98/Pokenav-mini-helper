const { token } = require("./server/keys.json"),
			fs = require("fs"),
			path = require("path"),
			Discord = require("discord.js"),
			{ handleCommand } = require("./handlers/commands.js"),
			{ dateToTime, errorMessage, dev } = require("./func/misc.js"),
			{ checkCleanupList } = require("./func/filter.js"),
			{ checkCategory } = require("./func/switchCat.js"),
			{ allNotificationServers, addReactionRole, removeReactionRole } = require("./func/notify.js"),
			{ loadServerFiles } = require("./func/load.js"),
			ver = require("./package.json").version,
			act = require("./server/globalConfig.json").activity || ver;

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES,
		Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
	partials: [
		"CHANNEL",
	],
	presence: {
		status: "online",
		activities: [{
			name: act,
			type: "PLAYING",
		}],
	},
	restRequestTimeout: 60000,
}),
launchDate = new Date(),
intendedServers = [];

// Loads all the variables at program launch
async function load(){
	console.log("======================================================================================\n");
	console.log("Server starting...");
	await loadServerFiles(client);
	await loadCommands();
	console.log("Logging in...");
	client.login(token);
}
// Loads the command files. This was standard in the discord.js guide
function loadCommands(){
	return new Promise((resolve) => {
		client.commands = new Discord.Collection();
		const commandFiles = fs.readdirSync(path.resolve(__dirname, "./commands")).filter(file => file.endsWith(".js"));
		for (const file of commandFiles) {		// Loads commands
			const command = require(`./commands/${file}`);
			client.commands.set(command.name, command);
		}
		console.log(`\nThe currently loaded commands and cooldowns are:\n• ${client.commands.map(c => c.name).join("\n• ")}`);
		resolve();
	});
}

load();

client.once("ready", async () => {
	await client.guilds.fetch();
	for (const [k, config] of client.configs) {
		const server = await client.guilds.fetch(k);
		intendedServers.push(k);
		if (!server){
			console.error("\nCould not fetch server with id:", config.serverID);
			continue;
		}
	}
	allNotificationServers(client, "make").catch((err) => console.error(err));
	const emojiServer = await client.guilds.cache.has("994034906306969691");
	const activeServers = client.guilds.cache;
	const activeServerList = [];
	activeServers.each(serv => activeServerList.push(`${serv.name}#${serv.id}${(intendedServers.includes(serv.id)) ? " **(intended)**" : ""}`));
	if (!emojiServer) {
		console.error("Please ask Soul to invite the bot to the Emoji server and give it the roles");
		process.exit(0);
	}
	const soul = await client.users.fetch(dev, false, true);
	client.user.setActivity(`${act}`);

	soul.send(`**Dev message:** Loaded in:\n• ${activeServerList.join("\n• ")}`).catch(console.error);
	console.log(`\nActive in:\n• ${activeServerList.join("\n• ")}`);
	console.log(`\nServer started at: ${launchDate.toLocaleString()}.`);
	console.log("\n======================================================================================");
})
.on("messageCreate", async (message) => {
	if (!intendedServers.includes(message.guild.id)) return;
	const ops = client.configs.get(message.guild.id);
	await checkCleanupList(message);
	if (message.author.bot && message.author.id != "155149108183695360") return; // Bot? Cancel
	const postedTime = new Date();
	const dm = (message.channel.type == "DM") ? true : false;
	if (dm) {
		if (message.content.startsWith("$")) {
			message.reply("Commands starting with `$` are for a different bot (Pokénav).").catch(() => {
				errorMessage(postedTime, dm, `Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.author.send(`Commands starting with \`$\` are for a different bot (Pokénav).\nYou can use them in <#${ops.profileChannel}> once you have confirmed you are above level ${ops.targetLevelRole} by sending a screenshot in <#${ops.screenshotChannel}>.`).catch(() => {
					errorMessage(postedTime, dm, `Error: I can not send a message to ${message.author.username}${message.author}.`);
				});
			});
		} else {
			message.reply(`This bot does not currently work in dms.\nPlease send your profile screenshot in <#${ops.screenshotChannel}>.`).catch(() => {
				errorMessage(postedTime, dm, `Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.author.send(`This bot does not currently work in dms.\nPlease send your profile screenshot in <#${ops.screenshotChannel}>.`);
			});
		}
		return;
	} /* else if (ops.respondCashEnd && message.member?.roles.cache.has(ops.modRole) && message.content == "$end") {
	 	console.log(`[${dateToTime(postedTime)}]: Used $end for ${message.author}`);
	 	message.author.send("Don't forget to use `/end` next time. 😉");
	 	message.reply("<@428187007965986826> end");
	 	return;
	}*/ else if (intendedServers.includes(message.guild.id)) handleCommand(message, postedTime); // command handler
})
.on("messageReactionAdd", (messageReaction, user) => {
	const ops = client.configs.get(messageReaction.message.guild.id);
	if (!ops) return;
	if (user.bot) return;
	if (messageReaction.message.channel.id == ops.notifyReactionChannel) addReactionRole(messageReaction, user);
	return;
})
.on("messageReactionRemove", (messageReaction, user) => {
	const ops = client.configs.get(messageReaction.message.guild.id);
	if (!ops) return;
	if (user.bot) return;
	if (messageReaction.message.channel.id == ops.notifyReactionChannel) removeReactionRole(messageReaction, user);
	return;
})
.on("shardError", (error) => {
	console.error(`[${dateToTime(new Date())}]: Websocket disconnect: ${error}`);
})
.on("shardResume", () => {
	console.error("Resumed! Refreshing Activity...");
	client.user.setActivity(`${act}`);
})
.on("shardDisconnect", () => {
	console.error("Disconnected!");
})
.on("shardReady", () => {
	console.error("Reconnected! Refreshing Activity...");
	client.user.setActivity(`${act}`);
})
.on("shardReconnecting", () => {
	console.error("Reconnecting...");
})
.on("channelCreate", async (channel) => {
	if (!intendedServers.includes(channel.guild.id)) return;
	await checkCategory(channel);
});


process.on("uncaughtException", (err) => {
	errorMessage(new Date(), false, `Uncaught Exception: ${err}`);
})
.on("unhandledRejection", (err, promise) => {
	console.error(`[${dateToTime(new Date())}]: Unhandled rejection at `, promise, `reason: ${err}`);
})
.on("SIGINT", () => {
  console.log(`Process ${process.pid} has been interrupted`);
});
