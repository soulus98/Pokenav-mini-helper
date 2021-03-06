const fs = require("fs"),
			path = require("path"),
			{ errorMessage, groupList } = require("../func/misc.js"),
			Discord = require("discord.js");
let list = new Discord.Collection();
function deleteMessage(message) {
	message.delete().catch(() => console.error(`Can not cleanup pokenav message:${message.id} from channel: ${message.channel.name}${message.channel}.`));
}
module.exports = {
	async checkCleanupList(message) {
		if (message.author.id != 428187007965986826) return; // pokenav message filtering
		const filtered = [];
		for (const g of list) {
			if (g[1].includes(message.channel.id)) {
				module.exports.cleanup(message, g[0]);
				filtered.push(true);
			} else {
				filtered.push(false);
			}
			if (filtered.length == list.size) {
				return;
			}
		}
	},
	cleanup(message, group) {
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
						m.react("????").then(() => {
							setTimeout(() => {
								return deleteMessage(m);
							}, 1500);
						}).catch(() => {
							console.error(`[${new Date()}]: Error: Could not react ???? (eyes) to message: ${m.url}\nContent of mesage: "${m.content}"`);
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
	addCleanupChannel(id, g) {
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
	removeCleanupChannel(id, g) {
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
	loadCleanupList() {
		return new Promise(function(resolve, reject) {
			for (const g of groupList) {
				list.set(g, []);
			}
			new Promise((res) => {
				try {
					delete require.cache[require.resolve("../server/cleanupList.json")];
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
					const jsonList = require("../server/cleanupList.json");
					for (const g in jsonList) {
						list.set(g, jsonList[g]);
					}
					const chAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					console.log(`\nCleanup list loaded. It contains ${chAmount} channels in ${list.size} groups: ${groupList.join(", ")}`);
					resolve(list);
				} catch (e) {
					if (e.code == "MODULE_NOT_FOUND") {
						fs.writeFile(path.resolve(__dirname, "../server/cleanupList.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
							if (err){
								reject(`Error thrown when writing the cleanup list file. Error: ${err}`);
								return;
							}
							console.log("Could not find cleanupList.json. Making a new one...");
							list = require("../server/cleanupList.json");
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
	saveCleanupList() {
		return new Promise((resolve) => {
			fs.writeFile(path.resolve(__dirname, "../server/cleanupList.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
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
