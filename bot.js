const { token } = require("./server/keys.json"),
			fs = require("fs"),
			path = require("path"),
			Discord = require("discord.js"),
			{ handleCommand } = require("./handlers/commands.js"),
			{ dateToTime, errorMessage } = require("./func/misc.js"),
			{ filter, loadFilterList } = require("./func/filter.js"),
			ver = require("./package.json").version;

const client = new Discord.Client({
			intents: [
				Discord.Intents.FLAGS.GUILDS,
				Discord.Intents.FLAGS.GUILD_MESSAGES,
			],
			partials: [
				"CHANNEL",
			],
			presence: {
				status: "online",
				activities: [{
					name: require("./server/config.json").activity || ver,
					type: "PLAYING",
				}],
			},
		}),
			launchDate = new Date();
let loaded = false,
		server = {},
		filterList = [];
ops = {};
module.exports = { loadConfigs };

// Loads all the variables at program launch
async function load(){
	console.log("======================================================================================\n");
	console.log("Server starting...");
		await loadConfigs();
		await loadCommands();
		await loadFilterList().then((list) => {
			filterList = list;
		});
		client.login(token);
}
// Loads (or re-loads) the bot settings
function loadConfigs(){
	return new Promise((resolve) => {
		ops = {};
		delete require.cache[require.resolve("./server/config.json")];
		ops = require("./server/config.json");
		if (!loaded){
			console.log("\nLoading configs...");
			console.log("\nConfigs:", ops);
			loaded = true;
			resolve();
		} else {
			(async () => {
				server = await client.guilds.fetch(ops.serverID);
				console.log("\nReloaded configs\n");
				resolve();
			})();
		}
	});
}
// Loads the command files. This was standard in the discord.js guide
function loadCommands(){
	return new Promise((resolve) => {
		client.commands = new Discord.Collection();
		const commandFiles = fs.readdirSync(path.resolve(__dirname, "./commands")).filter(file => file.endsWith(".js"));
		let commandFilesNames = "\nThe currently loaded commands and cooldowns are:\n";
		for (const file of commandFiles) {		// Loads commands
			const command = require(`./commands/${file}`);
			commandFilesNames = commandFilesNames + ops.prefix + command.name;
			if (command.cooldown){
				commandFilesNames = commandFilesNames + ":\t" + command.cooldown + " seconds \n";
			} else {
				commandFilesNames = commandFilesNames + "\n";
			}
			client.commands.set(command.name, command);
		}
		console.log(commandFilesNames);
		resolve();
	});
}
// Checks all the bot guilds and leaves them if they aren't the intended server
// If it is called from the main event, it sends a reply message
// This is vital, else someone could change the settings by simply inviting the bot to their server and being admin
// TODO: Make different settings for different servers. It is not necessary, but would be good practice
async function checkServer(message){
	const dev = await client.users.fetch("146186496448135168", false, true);
	// 216412752120381441
	if (ops.serverID === undefined) return;
	if (message){
		await message.reply("This is not the intended server. Goodbye forever :wave:").catch(() => {
				console.error(`[${dateToTime(new Date())}]: Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.channel.send("This is not the intended server. Goodbye forever :wave:");
			});
		message.guild.leave().then(s => {
			console.log(`Left: ${s}#${s.id}, as it is not the intended server.`);
			dev.send(`**Dev message: **Left: ${s}#${s.id}`).catch(console.error);
		}).catch(console.error);
	}
	const activeServers = client.guilds.cache;
	activeServers.each(serv => {
		if (serv.id != ops.serverID){
			serv.leave().then(s => {
				console.log(`Left: ${s}, as it is not the intended server.`);
				dev.send(`**Dev message: **Left: ${s}#${s.id}`).catch(console.error);
			}).catch(console.error);
		}
	});
}

load();

client.once("ready", async () => {
	server = await client.guilds.fetch(ops.serverID);
	const dev = await client.users.fetch("146186496448135168", false, true);
	checkServer();
	client.user.setActivity(`${ver}`);
	if (server == undefined){
		console.log("\nOops the screenshot server is broken.");
		return;
	}
	dev.send(`**Dev message: **Loaded mini bot in guild: "${server.name}"#${server.id}`);
	console.log(`\nServer started at: ${launchDate.toLocaleString()}. Loaded in guild: "${server.name}"#${server.id}`);
	console.log("\n======================================================================================\n");
});

client.on("shardError", (error) => {
	console.error(`[${dateToTime(new Date())}]: Websocket disconnect: ${error}`);
});

client.on("shardResume", () => {
	if (loaded) {
		console.error("Resumed! Refreshing Activity...");
		client.user.setActivity(`${ver}`);
	}
});

client.on("shardDisconnect", () => {
	console.error("Disconnected!");
});

client.on("shardReady", () => {
	if (loaded) {
		console.error("Reconnected! Refreshing Activity...");
		client.user.setActivity(`${ver}`);
	}
});

client.on("shardReconnecting", () => {
	console.error("Reconnecting...");
});

client.on("messageCreate", async message => {
	if (message.author.id == 428187007965986826){
		if (filterList.includes(message.channel.id)) {
			filter(message);
		} else if (ops.respondVerify){
			respondVerify(message);
		}
	}
	if (message.author.bot) return; // Bot? Cancel
	const postedTime = new Date();
	const dm = (message.channel.type == "DM") ? true : false;
	if (!dm && ops.serverID && message.guild.id != ops.serverID){ // If we are in the wrong server
		checkServer(message); // It passes message so that it can respond to the message that triggered it
		return;
	}
	if (dm) {
		if (message.content.startsWith("$")) {
			message.reply("Commands starting with `$` are for a different bot (Pokénav).").catch(() => {
				errorMessage(postedTime, dm, `Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.author.send(`Commands starting with \`$\` are for a different bot (Pokénav).\nYou can use them in <#${ops.profileChannel}> once you have confirmed you are above level ${ops.targetLevelRole} by sending a screenshot in <#${ops.screenshotChannel}>.`);
			});
		} else {
			message.reply(`This bot does not currently work in dms.\nPlease send your profile screenshot in <#${ops.screenshotChannel}>.`).catch(() => {
				errorMessage(postedTime, dm, `Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.author.send(`This bot does not currently work in dms.\nPlease send your profile screenshot in <#${ops.screenshotChannel}>.`);
			});
		}
		return;
	} else handleCommand(message, postedTime); // command handler
});

process.on("uncaughtException", (err) => {
	errorMessage(new Date(), false, `Uncaught Exception: ${err}`);
});

process.on("unhandledRejection", (err, promise) => {
			errorMessage(new Date(), false, `Unhandled rejection at ${promise} reason: ${err}`);
});

process.on("SIGINT", () => {
  console.log(`Process ${process.pid} has been interrupted`);
});
