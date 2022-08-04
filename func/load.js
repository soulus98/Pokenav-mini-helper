const { loadNotifyList } = require("./notify.js"),
			{ loadCleanupList } = require("./filter.js"),
			{ loadRaidCatList } = require("./switchCat.js"),
			fs = require("fs"),
			path = require("path"),
			Discord = require("discord.js");
let loaded = false;


module.exports = {
	async loadServerFiles(client){
		client.configs = new Discord.Collection();
		const serverFolders = fs.readdirSync(path.resolve(__dirname, "../server")).filter(file => !file.endsWith(".json"));
		for (const folder of serverFolders) {
			console.log(`\nLoading "${folder}" server files...`);
			const sId = await loadConfig(folder, client);
			await loadNotifyList(folder, sId);
			await loadCleanupList(folder, sId);
			await loadRaidCatList(folder, sId);
		}
		loaded = true;
	},
};
async function loadConfig(folder, client){
	const config = require(`../server/${folder}/config.json`);
	client.configs.set(config.serverID, config);
	if (!loaded){
		console.log("Configs:", config);
		return config.serverID;
	} else {
		console.log(`\nReloaded configs for ${folder}\n`);
		return config.serverID;
	}
}
