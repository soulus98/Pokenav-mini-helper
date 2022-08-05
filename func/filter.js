const fs = require("fs"),
			path = require("path"),
			{ errorMessage, groupList, dev } = require("../func/misc.js"),
			Discord = require("discord.js"),
			serverLists = new Discord.Collection(),
			lookup = new Discord.Collection();

function deleteMessage(message) {
	message.delete().catch(() => console.error(`Can not cleanup message:${message.id} from channel: ${message.channel.name}${message.channel}.\nMessage content: ${message.content}`));
}
module.exports = {
	async checkCleanupList(message) {
		const list = serverLists.get(message.guild.id);
		if (!list) return;
		const ops = message.client.configs.get(message.guild.id);
		if (
			message.channel.type == "DM"
			|| message.author.id == dev
		) return;
		for (const g of list) {
			if (!g[1].includes(message.channel.id)) {
				if (g[0] == list.lastKey()) {
					return;
				}
				continue;
			}
			if (message.author.id == "428187007965986826") module.exports.pokeNavCleanup(message, g[0]); // pokenav message filtering
			if (
				message.author.bot
				|| message.member.roles.cache.has(ops.modRole)
				|| message.member.permissions.has("ADMINISTRATOR")
			) return;
			else module.exports.cleanup(message, g[0]);
		}
	},
	pokeNavCleanup(message, group) {
		const ops = message.client.configs.get(message.guild.id);
		switch (group) {
			case "raid":
				if (message.embeds[0]?.description?.startsWith("There are too many channels under the category")) {
					message.channel.send(`<@&${ops.modRole}> Maximum channels reached in the category.\nTell the techs/admins that they need to link more categories.`);
					return deleteMessage(message);
				}
				if (
				message.embeds[0]?.title?.toLowerCase().includes("raid")
				|| message.embeds[0]?.author?.name?.toLowerCase().includes("raid")
				|| message.embeds[0]?.fields[0]?.name?.toLowerCase().includes("host")
				|| message.embeds[0]?.fields[0]?.name?.toLowerCase().includes("members")
				|| message.embeds[0]?.fields[1]?.name?.toLowerCase().includes("host")
				|| message.embeds[0]?.fields[1]?.name?.toLowerCase().includes("members")
				) return;
				return deleteMessage(message);
			case "profile":
				if (message.content.startsWith("You do not have permission to use")) {
					return deleteMessage(message);
				}
				return;
			case "badge":
			setTimeout(() => {
				message.fetch().then(m => {
					if (
						m.embeds[0]?.title == "No Change Made To Trainer's Badge"
						|| m.embeds[0]?.description == "Could not convert \"role_or_trainer\" into Role or Trainer."
					) return;
					if (
						m.embeds[0]?.title == "Badge Granted!"
						|| m.embeds[0]?.title == "Badge Revoked!"
					) {
						m.react("👀").then(() => {
							setTimeout(() => {
								return deleteMessage(m);
							}, 1500);
						}).catch(() => {
							console.error(`[${new Date()}]: Error: Could not react 👀 (eyes) to message: ${m.url}\nContent of mesage: "${m.content}"`);
							setTimeout(() => {
								return deleteMessage(m);
							}, 1500);
						});
					}
				});
			}, 750);
		return;
			case "pvpiv":
				setTimeout(() => {
					message.fetch().then(m => {
						const emb = m.embeds[0];
						if (
							emb?.title?.toLowerCase().includes("rank")
							|| emb?.footer?.text?.toLowerCase().includes("pvpoke")
							|| emb?.footer?.text?.toLowerCase().includes("silph")
							|| emb?.description?.toLowerCase().includes("pvpoke")
							|| emb?.description?.startsWith("No data for")
							|| emb?.description?.toLowerCase().includes("silph")
						) {
							return;
						} else {
							return deleteMessage(message);
						}
					});
				}, 1500);
				return;
			default:
				message.reply("Please tell soul(<@146186496448135168>) an impossible error occured involving the cleanup switch.");
				console.error(`[${new Date()}]: Error: An impossible error occured involving the cleanup switch.`);
				return;
		}
	},
	async cleanup(message, group){
		const ops = message.client.configs.get(message.guild.id);
		switch (group) {
			case "raid":
				if (message.content.startsWith("$r")) {
					const m = await message.channel.send(`${message.member}, \`$r\` and \`$raid\` have been replaced with \`/raid\`\nSee <#${ops.howToChannel}> for instructions`);
					setTimeout(() => {
						m.delete();
					}, 6000);
				}
				return deleteMessage(message);
			default:
				return;
		}
	},
	addCleanupChannel(id, g, sId) {
		const list = serverLists.get(sId);
		return new Promise((resolve, reject) => {
			const group = list.get(g);
			if (group.includes(id)) return reject();
			group.push(id);
			list.set(g, group);
			module.exports.saveCleanupList().then(() => {
				resolve();
			});
		});
	},
	removeCleanupChannel(id, g, sId) {
		const list = serverLists.get(sId);
		return new Promise((resolve, reject) => {
			if (g == "all") {
				const removed = [];
				for (const gr of list) {
					if (gr[1].includes(id)) {
						gr[1].splice(gr[1].indexOf(id));
						removed.push(true);
					} else {
						removed.push(false);
					}
				}
				if (removed.includes(true)) {
					module.exports.saveCleanupList().then(() => {
						resolve();
					});
				} else {
					reject();
				}
				return;
			}
			const group = list.get(g);
			if (!group.includes(id)) return reject();
			group.splice(group.indexOf(id));
			list.set(g, group);
			module.exports.saveCleanupList().then(() => {
				resolve();
			});
		});
	},
	loadCleanupList(folder, sId) {
		let list = new Discord.Collection();
		if (!folder) folder = lookup.get(sId);
		return new Promise(function(resolve, reject) {
			for (const g of groupList) {
				list.set(g, []);
			}
			new Promise((res) => {
				try {
					delete require.cache[require.resolve(`../server/${folder}/cleanupList.json`)];
					res();
				} catch (e){
					if (e.code == "MODULE_NOT_FOUND") {
						// do nothing
						res();
					} else {
						reject(`Error thrown when loading cleanup list. Error: ${e}`);
						return;
					}
				}
			}).then(() => {
				try {
					const jsonList = require(`../server/${folder}/cleanupList.json`);
					for (const g in jsonList) {
						list.set(g, jsonList[g]);
					}
					const chAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					console.log(`Cleanup list loaded. It contains ${chAmount} channels in ${list.size} groups: ${groupList.join(", ")}`);
					serverLists.set(sId, list);
					lookup.set(sId, folder);
					resolve(list);
				} catch (e) {
					if (e.code == "MODULE_NOT_FOUND") {
						fs.writeFile(path.resolve(__dirname, `../server/${folder}/cleanupList.json`), JSON.stringify(Object.fromEntries(list)), (err) => {
							if (err){
								reject(`Error thrown when writing the cleanup list file. Error: ${err}`);
								return;
							}
							console.log("Could not find cleanupList.json. Making a new one...");
							list = require(`../server/${folder}/cleanupList.json`);
							serverLists.set(sId, list);
							lookup.set(sId, folder);
							resolve(list);
						});
					}	else {
						reject(`Error thrown when loading the cleanup list (2). Error: ${e}`);
						return;
					}
				}
			});
		});
	},
	saveCleanupList(sId) {
		const folder = lookup.get(sId);
		return new Promise((resolve) => {
			fs.writeFile(path.resolve(__dirname, `../server/${folder}/cleanupList.json`), JSON.stringify(Object.fromEntries(serverLists.get(sId))), (err) => {
				if (err){
					errorMessage(new Date(), false, `Error: An error occured while saving the cleanup list. Error: ${err}`);
					return;
				} else {
					resolve();
					return;
				}
			});
		});
	},
};
