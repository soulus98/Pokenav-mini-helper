/* eslint max-nested-callbacks: 0 */
const Discord = require("discord.js"),
			fs = require("fs"),
			path = require("path"),
			{ errorMessage, dateToTime } = require("../func/misc.js");
let list = new Discord.Collection();


module.exports = {
	async notify(message, args) {
		if (hasDuplicates(args)) throw ["dupe"];
		console.log(`[${dateToTime(new Date())}]Beginning notification workflow for: ${args.join(", ")}`);
		const checkedArgs = await argsCheck(args);
		if (!checkedArgs.length) throw ["already"];
		const messageData = [];
		const removedArgs = args.filter((v) => !checkedArgs.includes(v));
		if (removedArgs.length) messageData.push(`The following bosses were found in the saved list: \`${removedArgs.join("`, `")}\``);
		const [result, md] = await pokeNavCheck(checkedArgs, message);
		md.forEach((item) => messageData.push(item));
		if (typeof result == "string") throw [result, messageData];
		for (const [k, v] of result) {
			if (hasDuplicates(v.map(i => i.name))) throw ["dupe", k];
		}
		await makeRoles(result, message).catch(console.error);
		await makeEmoji(result, message).catch(console.error);
		const newList = new Discord.Collection;
		list.forEach((arr, key) => {
			if (result.has(key)) {
				const resultArr = result.get(key);
				const newArr = arr.concat(resultArr).sort((a, b) => a.name - b.name);
				newList.set(key, newArr);
			} else {
				newList.set(key, arr);
			}
		});
		result.forEach((arr, key) => {
			if (!list.has(key)) {
				newList.set(key, arr.sort((a, b) => a.name - b.name));
			}
		});
		module.exports.makeNotificationReactions(message, newList).then(() => {
			message.reply(`Notifications added.${(messageData.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
		}).catch((err) => {
			message.reply(err);
			console.error(err);
		});
	},
	loadNotifyList() {
		return new Promise(function(resolve, reject) {
			new Promise((res) => {
				try {
					delete require.cache[require.resolve("../server/notifyList.json")];
					res();
				} catch (e){
					if (e.code == "MODULE_NOT_FOUND") {
						// do nothing
						res();
					} else {
						reject(`Error thrown when loading notify list. Error: ${e}`);
						return;
					}
				}
			}).then(() => {
				try {
					const jsonList = require("../server/notifyList.json");
					for (const g in jsonList) {
						list.set(g, jsonList[g]);
					}
					const bossAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					console.log(`\nNotification list loaded. It contains ${list.size} tiers with ${bossAmount} bosses.`);
					resolve(list);
				} catch (e) {
					if (e.code == "MODULE_NOT_FOUND") {
						fs.writeFile(path.resolve(__dirname, "../server/notifyList.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
							if (err){
								reject(`Error thrown when writing the notify list file. Error: ${err}`);
								return;
							}
							console.log("\nCould not find notifyList.json. Making a new one...");
							list = require("../server/notifyList.json");
							resolve(list);
						});
					}	else {
						reject(`Error thrown when loading the notify list (2). Error: ${e}`);
						return;
					}
				}
			});
		});
	},
	saveNotifyList() {
		return new Promise((resolve) => {
			fs.writeFile(path.resolve(__dirname, "../server/notifyList.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
				if (err){
					errorMessage(new Date(), false, `Error: An error occured while saving the notify list. Error: ${err}`);
					return;
				} else {
					resolve();
					return;
				}
			});
		});
	},
	async addReactionRole(messageReaction, user){
		try {
			const tier = messageReaction.message.embeds[0]?.title;
			const emojiName = messageReaction.emoji.name;
			const roleName = "Notify" + emojiName;
			if (list.get(tier).map(i => i.name).includes(emojiName)) {
				const server = messageReaction.message.guild;
				const member = await server.members.fetch(user.id);
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${dateToTime(new Date())}] Adding role ${role.name} to ${user.username}${user}`);
					member.roles.add(role.id).catch((e) => {
						console.error(`[${dateToTime(new Date())}] Could not add ${roleName} to ${user.username}${user}. Error: ${e}`);
					});
				}	else {
					messageReaction.message.channel.send(`<@${ops.modRole}> I could not find a role. Please tell Soul.`);
					console.error(`[${dateToTime(new Date())}] An error occured. I could not find the ${roleName} role. Someone may have deleted it?`);
				}
			} else {
				messageReaction.message.channel.send(`<@${ops.modRole}> An emoji was not found in the saved list. Please tell Soul.`);
				console.error(`[${dateToTime(new Date())}] An error occured. I could not find the ${emojiName} emoji in the list! An erroneous reaction?`);
			}
		} catch (e) {
			console.error(e);
		}
	},
	async removeReactionRole(messageReaction, user){
		try {
			const tier = messageReaction.message.embeds[0]?.title;
			const emojiName = messageReaction.emoji.name;
			const roleName = "Notify" + emojiName;
			if (list.get(tier).map(i => i.name).includes(emojiName)) {
				const server = messageReaction.message.guild;
				const member = await server.members.fetch(user.id);
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${dateToTime(new Date())}] Removing role ${role.name} from ${user.username}${user}`);
					member.roles.remove(role.id).catch((e) => {
						console.error(`[${dateToTime(new Date())}] Could not remove ${roleName} from ${user.username}${user}. Error: ${e}`);
					});
				}	else {
					messageReaction.message.channel.send(`<@${ops.modRole}> I could not find a role. Please tell Soul.`);
					console.error(`[${dateToTime(new Date())}] An error occured. I could not find the ${roleName} role. Someone may have deleted it?`);
				}
			} else {
				messageReaction.message.channel.send(`<@${ops.modRole}> An emoji was not found in the saved list. Please tell Soul.`);
				console.error(`[${dateToTime(new Date())}] An error occured. I could not find the ${emojiName} emoji in the list! An erroneous reaction?`);
			}
		} catch (e) {
			console.error(e);
		}
	},
	clearNotify(message, args){
		console.log(`[${dateToTime(new Date())}]Clearing notification workflow for: ${args.join(", ")}`);
		return new Promise((resolve, reject) => {
			if (args[0].toLowerCase() == "all") {
				deleteRoles(list, message).then(async () => {
					await deleteEmoji(list, message);
					list = new Discord.Collection();
					module.exports.deleteNotificationReactions(message, "all").then(() => {
						message.reply("Notifications removed.");
						resolve();
					});
				});
				return;
			}
			if (hasDuplicates(args)) return reject(["dupe"]);
			pokeNavCheck(args, message).then(async ([result, messageData]) => {
				await deleteRoles(result, message);
				await deleteEmoji(result, message);
				const newList = new Discord.Collection();
				module.exports.deleteNotificationReactions(message, result).then(() => {
					list.forEach((arr, tier) => {
						if (result.has(tier)) {
							const newArr = arr.filter((i) => !result.get(tier).map(i2 => i2.name).includes(i.name));
							if (newArr.length) {
								newList.set(tier, newArr);
							} else {
								newList.delete(tier);
							}
						} else {
							newList.set(tier, arr);
						}
					});
					list = newList;
					console.log("Updating saved list");
					module.exports.saveNotifyList().then(() => {
						return;
					});
					message.reply(`Notifications removed.${(messageData.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
				}).catch((err) => {
					message.reply(err);
					console.error(err);
				});
			});
		});
	},
	async makeNotificationReactions(input, newList){
		let notifyChannel;
		if (input instanceof Discord.Message) notifyChannel = await input.guild.channels.fetch(ops.notifyReactionChannel);
		else if (input instanceof Discord.Guild) notifyChannel = await input.channels.fetch(ops.notifyReactionChannel);
		else throw "Could not load notifyChannel";
		if (!newList) newList = list;
		const existingMessages = await notifyChannel.messages.fetch({ limit: 6 }).then((ms) => ms.filter((msg) => !msg.pinned));
		if (newList.size == 0) {
			notifyChannel.bulkDelete(existingMessages);
			console.log("Saving blank list");
			module.exports.saveNotifyList();
			return;
		}
		const existingIds = new Discord.Collection;
		existingMessages.forEach((item, k) => {
			if (item.embeds[0]) existingIds.set(item.embeds[0].title, k);
		});
		console.log("Adding reactions");
		newList.forEach(async (arr, tier) => {
			if (existingIds.has(tier)) {
				console.log(`Reacting to ${tier} message`);
				const message = await notifyChannel.messages.fetch(existingIds.get(tier));
				for (const item of arr) {
					message.react(item.identifier);
					if (newList.lastKey() == tier && arr.indexOf(item) == arr.length - 1) {
						list = newList;
						console.log("Updating saved list");
						module.exports.saveNotifyList().then(() => {
							return;
						});
					}
				}
			} else {
				console.log(`Sending a new ${tier} message and reacting`);
				const embed = new Discord.MessageEmbed()
				.setTitle(tier)
				.setDescription(`Click on a ${tier} to be notified when a new raid is posted.\nClick it again to remove the notification.`);
				const message = await notifyChannel.send({ embeds: [embed] });
				for (const item of arr) {
					message.react(item.identifier);
					if (newList.lastKey() == tier && arr.indexOf(item) == arr.length - 1) {
						list = newList;
						console.log("Updating saved list");
						module.exports.saveNotifyList().then(() => {
							return;
						});
					}
				}
			}
		});
	},
	async deleteNotificationReactions(message, inputList){
		try {
			console.log("Deleting notifications");
			const notifyChannel = await message.guild.channels.fetch(ops.notifyReactionChannel);
			const existingMessages = await notifyChannel.messages.fetch({ limit: 6 }).then((ms) => ms.filter((msg) => !msg.pinned));
			const deleteNames = inputList.map(v => v).flat().map((i) => i.name);
			for (const [k1, msg] of existingMessages) {
				const reactionsToDelete = msg.reactions.cache.filter((r) => deleteNames.includes(r.emoji.name));
				if (reactionsToDelete.size == msg.reactions.cache.size) {
					msg.delete();
				}	else {
					for (const [k2, item] of reactionsToDelete) {
						await item.remove();
						if (reactionsToDelete.lastKey() == k2 && existingMessages.lastKey() == k1) return;
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	},
};

async function argsCheck(args) {
	let checkedArgs = args;
	if (list.size == 0) return checkedArgs;
	for (const item of list) {
		checkedArgs = checkedArgs.filter((v) => !item[1].includes(v));
		if (list.lastKey() == item[0]) return checkedArgs;
	}
}

async function pokeNavCheck(data, message, messageData, i, result) {
	if (!i) i = 0;
	if (!result) result = new Discord.Collection;
	if (!messageData) messageData = [];
	const pokenavChannel = await message.guild.channels.fetch(ops.pokenavChannel);
	return new Promise((resolve) => {
		message.react("👀");
		const mon = data[i];
		console.log(`Checking ${mon} counters for tier`);
		pokenavChannel.send(`<@428187007965986826> counters ${mon}`).then(() => {
			const filter = m => {
				return m.author.id == 428187007965986826 && (m.embeds[0]?.title.toLowerCase().includes("tier") || m.embeds[0]?.title.toLowerCase().includes("error"));
			};
			pokenavChannel.awaitMessages({ filter, max: 1, time: 20000, errors: ["time"] }).then((resp) => {
				try {
					const emb = resp.first().embeds[0];
					const respTitle = emb.title;
					pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
					const eURL = emb.thumbnail?.url;
					if (respTitle == "Error") {
						console.log(`${mon} was not found by pokenav.`);
						messageData.push(`PokeNav could not find \`${mon}\`. Please try again for that boss.`);
					} else {
						const tierLocation = respTitle.toLowerCase().indexOf("tier");
						const tier = respTitle.slice(tierLocation, respTitle.length - 1);
						const newMon = respTitle.slice(6, tierLocation - 2);
						let group = result.get(tier);
						if (!group) group = [];
						group.push({ name: newMon, url: eURL });
						result.set(tier, group);
					}
					if (i == data.length - 1) {
						if (result.size > 0) {
							resolve([result, messageData]);
						} else {
							resolve(["none", messageData]);
						}
					} else {
						i++;
						pokeNavCheck(data, message, messageData, i, result).then(([r, m]) => resolve([r, m]));
					}
				} catch (e) {
					return console.error("An unexpected error in ]notify. error:", e);
				}
			}).catch(() => {
				console.log(`${mon} took more than 20 seconds for pokenav to find...?`);
				messageData.push(`PokeNav did not respond quickly enough (or too quickly) for \`${mon}\`. Please try again for that boss.`);
				if (data.indexOf(mon) == data.length - 1) {
					if (result.size > 0) {
						resolve([result, messageData]);
					} else {
						resolve(["none", messageData]);
					}
				} else {
					i++;
					pokeNavCheck(data, message, messageData, i, result).then(([r, m]) => resolve([r, m]));
				}
			});
		});
	});
}

function makeRoles(input, message) {
	console.log("Making/checking roles & rules");
  return new Promise((resolve) => {
    const pokenavChannel = message.guild.channels.cache.get(ops.pokenavChannel);
		for (const tier of input){
			for (const bossItem of tier[1]) {
				const bossName = bossItem.name;
				const roleName = "Notify" + bossName;
				const role = message.guild.roles.cache.find(r => r.name == roleName);
				if (!role) {
					console.log(`Creating role: ${roleName}.`);
					message.guild.roles.create({ name: roleName }).then(() => {
						pokenavChannel.send(`<@428187007965986826> create notify-rule ${roleName} "boss:${bossName}"`).then((msg) => {
							msg.delete();
							if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
								resolve();
							}
						});
					});
				} else {
					console.log(`Role: ${roleName} already exists.`);
					pokenavChannel.send(`<@428187007965986826> create notify-rule ${roleName} "boss:${bossName}"`).then((msg) => {
						msg.delete();
						if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							resolve();
						}
					});
				}
			}
		}
  });
}

function deleteRoles(input, message) {
	console.log("Deleteing roles & rules");
	return new Promise((resolve) => {
		for (const tier of input){
			for (const bossItem of tier[1]) {
				const bossName = bossItem.name;
				const roleName = "Notify" + bossName;
				const role = message.guild.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`Deleting role: ${roleName}.`);
					message.guild.roles.delete(role).then(() => {
						if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							resolve();
						}
					});
				} else {
					console.log(`Role: ${roleName} didn't exist.`);
					if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
						resolve();
					}
				}
			}
		}
  });
}

async function makeEmoji(input, message) {
	try {
		const emojiServer = await message.client.guilds.cache.get("994034906306969691");
		const allEmoji = await emojiServer.emojis.fetch(undefined, { force: true });
		for (const [k, v] of input) {
			for (const item of v) {
				const emoji = allEmoji.find(e => e.name == item.name);
				if (!emoji) {
					console.log(`Creating an Emoji named ${item.name} on the emojiServer`);
					item.identifier = await emojiServer.emojis.create(item.url, item.name).then((e) => e.identifier).catch(err => console.error(`Cache failed when making an emoji for ${item.name}. It already existed`, err));
					if (v.indexOf(item) == item.length - 1 && input.lastKey() == k) return;
				} else {
					console.log(`An Emoji named ${item.name} already existed on the emojiServer`);
					item.identifier = emoji.identifier;
					if (v.indexOf(item) == item.length - 1 && input.lastKey() == k) return;
				}
			}
		}
	} catch (e) {
		console.error(e);
	}
}

async function deleteEmoji(input, message) {
	const emojiServer = message.client.guilds.cache.get("994034906306969691");
	for (const [k, v] of input) {
		for (const item of v) {
			const allEmoji = await emojiServer.emojis.fetch();
			const emoji = allEmoji.find((e) => e.name == item.name);
			await emojiServer.emojis.delete(emoji).then(() => console.log(`Deleted Emoji ${item.name}`)).catch((e) => {
				if (e.code == "INVALID_TYPE") console.error(`Emoji ${item.name} didn't exist`);
				else console.error(e);
			});
			if (v.indexOf(item) == item.length - 1 && input.lastKey() == k) return;
		}
	}
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}
