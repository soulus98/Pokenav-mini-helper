/* eslint max-nested-callbacks: 0 */
const Discord = require("discord.js"),
			fs = require("fs"),
			path = require("path"),
			{ errorMessage, dateToTime, dev } = require("./misc.js");
const serverLists = new Discord.Collection(),
		lookup = new Discord.Collection(),
		pokemonLookup = new Discord.Collection();


module.exports = {
	async notify(message, args) {
		const list = serverLists.get(message.guild.id);
		if (hasDuplicates(args)) throw ["dupe"];
		console.log(`[${dateToTime(new Date())}]Beginning notification workflow for: ${args.join(", ")}`);
		const checkedArgs = await argsCheck(args, list);
		if (!checkedArgs.length) throw ["already"];
		const messageData = [];
		const removedArgs = args.filter((v) => !checkedArgs.includes(v));
		if (removedArgs.length) messageData.push(`The following bosses were found in the saved list: \`${removedArgs.join("`, `")}\``);
		message.react("👀");
		const [result, md] = await pokeNavCheck(checkedArgs, message);
		md.forEach((item) => messageData.push(item));
		if (typeof result == "string") throw [result, messageData];
		for (const [k, v] of result) {
			if (hasDuplicates(v.map(i => i.name))) throw ["dupe", k];
		}
		await makeRoles(result, message).catch(console.error);
		const md2 = await makeEmoji(result, message).catch(console.error);
		md2.forEach((item) => messageData.push(item));
		if (messageData.length == args.length) throw ["none", messageData];
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
		await module.exports.allNotificationServers(message.client, newList);
		message.reply(`Notifications added.\n<#${message.client.configs.get(message.guild.id).notifyReactionChannel}>${(messageData?.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
	},
	async override(message, boss, tier, emoji) {
		if (!emoji) {
			message.reply("I need an emoji or Soul needs to fix the emoji grabber thingy\nUsage is `]override <boss> <tier> [emoji]`");
			return;
		}
		const list = serverLists.get(message.guild.id);
		console.log(`[${dateToTime(new Date())}]Beginning manual override for: ${boss}`);
		for (const item of list) {
			if (item[1].includes(boss)) throw ["already"];
		}
		message.react("👀");
		// const res = await pokeNavOverrideCheck(boss, message);
		const tempItem = { name : boss };
		if (emoji.startsWith("<")) emoji = emoji.slice(2, -1);
		if (emoji) tempItem.identifier = emoji;
		const tempList = new Discord.Collection().set(tier, [tempItem]);
		await makeRoles(tempList, message);
		if (!emoji) await makeEmoji(tempList, message);
		if (!list.get(tier)) list.set(tier, [tempItem]);
		else {
			const newArr = list.get(tier);
			newArr.push(tempItem);
			newArr.sort((a, b) => a.name - b.name);
			list.set(tier, newArr);
		}
		await module.exports.allNotificationServers(message.client, list);
		message.reply(`Notifications added.\n<#${message.client.configs.get(message.guild.id).notifyReactionChannel}>`);
	},
	loadNotifyList(folder, sId) {
		let list = new Discord.Collection();
		if (!folder) folder = lookup.get(sId);
		return new Promise(function(resolve, reject) {
			new Promise((res) => {
				try {
					delete require.cache[require.resolve(`../server/${folder}/notifyList.json`)];
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
					const jsonList = require(`../server/${folder}/notifyList.json`);
					for (const g in jsonList) {
						list.set(g, jsonList[g]);
					}
					const bossAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					console.log(`Notification list loaded. It contains ${list.size} tiers with ${bossAmount} bosses.`);
					serverLists.set(sId, list);
					lookup.set(sId, folder);
					resolve(list);
				} catch (e) {
					if (e.code == "MODULE_NOT_FOUND") {
						fs.writeFile(path.resolve(__dirname, `../server/${folder}/notifyList.json`), JSON.stringify(Object.fromEntries(list)), (err) => {
							if (err){
								reject(`Error thrown when writing the notify list file. Error: ${err}`);
								return;
							}
							console.log("\nCould not find notifyList.json. Making a new one...");
							list = require(`../server/${folder}/notifyList.json`);
							serverLists.set(sId, list);
							lookup.set(sId, folder);
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
	saveNotifyList(sId) {
		const folder = lookup.get(sId);
		return new Promise((resolve) => {
			fs.writeFile(path.resolve(__dirname, `../server/${folder}/notifyList.json`), JSON.stringify(Object.fromEntries(serverLists.get(sId))), (err) => {
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
		const list = serverLists.get(messageReaction.message.guild.id);
		const ops = messageReaction.client.configs.get(messageReaction.message.guild.id);
		try {
			const tier = messageReaction.message.embeds[0]?.title;
			const emojiName = messageReaction.emoji.name.replace(/_/g, "-");
			const roleName = "Notify" + emojiName;
			const tierArr = list.get(tier);
			if (!tierArr) return console.error(`I could not find the "${tier}" tier in the list. Perhaps there are other message reactions in the channel`);
			if (tierArr.map(i => i.name).includes(emojiName)) {
				const server = messageReaction.message.guild;
				const member = await server.members.fetch(user.id);
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${dateToTime(new Date())}] Adding role ${role.name} to ${user.username}${user}`);
					member.roles.add(role.id).catch((e) => {
						console.error(`[${dateToTime(new Date())}] Could not add ${roleName} to ${user.username}${user}. Error: ${e}`);
					});
				}	else {
					const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
					pokenavChannel.send(`<@&${ops.modRole}> I could not find a role while adding. Please tell Soul.`);
					console.error(`[${dateToTime(new Date())}] An error occured. I could not find the ${roleName} role. Someone may have deleted it?`);
				}
			} else {
				const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
				pokenavChannel.send(`<@&${ops.modRole}> An emoji was not found in the saved list while adding. Please tell Soul.`);
				console.error(`[${dateToTime(new Date())}] An error occured. I could not find the ${emojiName} emoji in the list! An erroneous reaction?`);
			}
		} catch (e) {
			console.error(e);
		}
	},
	async removeReactionRole(messageReaction, user){
		const list = serverLists.get(messageReaction.message.guild.id);
		const ops = messageReaction.client.configs.get(messageReaction.message.guild.id);
		try {
			const tier = messageReaction.message.embeds[0]?.title;
			const emojiName = messageReaction.emoji.name.replace(/_/g, "-");
			const roleName = "Notify" + emojiName;
			const tierArr = list.get(tier);
			if (!tierArr) return console.error(`I could not find the "${tier}" tier in the list. Perhaps there are other message reactions in the channel`);
			if (tierArr.map(i => i.name).includes(emojiName)) {
				const server = messageReaction.message.guild;
				const member = await server.members.fetch(user.id);
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${dateToTime(new Date())}] Removing role ${role.name} from ${user.username}${user}`);
					member.roles.remove(role.id).catch((e) => {
						console.error(`[${dateToTime(new Date())}]: Could not remove ${roleName} from ${user.username}${user}. Error: ${e}`);
					});
				}	else {
					const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
					pokenavChannel.send(`<@&${ops.modRole}> I could not find a role while removing. Please tell Soul.`);
					console.error(`[${dateToTime(new Date())}]: An error occured. I could not find the ${roleName} role. Someone may have deleted it?`);
				}
			} else {
				const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
				pokenavChannel.send(`<@&${ops.modRole}> An emoji was not found in the saved list while removing. Please tell Soul.`);
				console.error(`[${dateToTime(new Date())}]: An error occured. I could not find the ${emojiName} emoji in the list! An erroneous reaction?`);
			}
		} catch (e) {
			console.error(e);
		}
	},
	async clearNotify(message, args){
		const list = serverLists.get(message.guild.id);
		console.log(`[${dateToTime(new Date())}]Clearing notification workflow for: ${args.join(", ")}`);
		const newArgs = [...args];
		message.react("👀");
		if (args[0].toLowerCase() == "all") {
			await deleteRoles(list, message);
			await deleteEmoji(list, message);
			serverLists.set(message.guild.id, new Discord.Collection());
			await module.exports.deleteNotificationReactions(message, "all");
			message.reply("Notifications removed.");
			return;
		}
		if (hasDuplicates(args)) throw ["dupe"];
		const tempList = new Discord.Collection();
		for (const boss of args) {
			const lcBoss = boss.toLowerCase();
			for (const [tier, group] of list) {
				const lcGroupNames = group.map(i => i.name).map(i => i.toLowerCase());
				if (lcGroupNames.includes(lcBoss)) {
					const realTierName = tier;
					const realBoss = group[lcGroupNames.indexOf(lcBoss)];
					const tempGroup = tempList.get(tier);
					if (tempGroup) {
						tempGroup.push(realBoss);
						tempList.set(realTierName, tempGroup);
					} else tempList.set(realTierName, [realBoss]);
					newArgs.splice(newArgs.indexOf(boss), 1);
				}
			}
		}
		let result, messageData;
		if (newArgs.length) [result, messageData] = await pokeNavCheck(newArgs, message);
		if (result?.size) {
			for (const [tier, group] of result) {
				const tempGroup = tempList.get(tier);
				let newGroup = group;
				if (tempGroup) newGroup = group.concat(tempGroup).sort((a, b) => a.name - b.name);
				tempList.set(tier, newGroup);
			}
		}
		result = tempList;
		await deleteRoles(result, message);
		await deleteEmoji(result, message);
		const newList = new Discord.Collection();
		await module.exports.deleteNotificationReactions(message, result);
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
		newList.sort(sortList);
		serverLists.set(message.guild.id, newList);
		console.log("Updating saved list");
		module.exports.saveNotifyList(message.guild.id).then(() => {
			return;
		});
		message.reply(`Notifications removed.${(messageData?.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
	},
	async makeNotificationReactions(server, newList){
		const sId = server.id;
		const ops = server.client.configs.get(sId);
		const notifyChannel = await server.channels.fetch(ops.notifyReactionChannel);
		if (!newList) newList = serverLists.get(sId);
		const existingMessages = await notifyChannel.messages.fetch({ limit: 10 }).then((ms) => ms.filter((msg) => !msg.pinned));
		if (newList.size == 0) {
			notifyChannel.bulkDelete(existingMessages).catch(console.error);
			console.log("Saving blank list");
			module.exports.saveNotifyList(sId);
			return;
		}
		const existingIds = new Discord.Collection;
		existingMessages.forEach((item, k) => {
			if (item.embeds[0]) existingIds.set(item.embeds[0].title, k);
		});
		console.log("Checking and adding reactions");
		const lastKey = newList.lastKey();
		for (const [tier, arr] of newList){
			let message;
			if (arr.length == 0) {
				console.log(`Deleting ${tier} message`);
				message = await notifyChannel.messages.fetch(existingIds.get(tier));
				await message.delete();
				newList.delete(tier);
				if (lastKey == tier) saveList(newList, sId);
			} else {
				if (existingIds.has(tier)) {
					console.log(`Reacting to ${tier} message`);
					message = await notifyChannel.messages.fetch(existingIds.get(tier));
				} else {
					console.log(`Sending a new ${tier} message and reacting`);
					const embed = new Discord.MessageEmbed()
					.setTitle(tier)
					.setDescription(`Click on a **${tier}** to be notified when a new raid is posted.\nClick it again to remove the notification.`)
					.setColor(0xFF00FF);
					message = await notifyChannel.send({ embeds: [embed] });
				}
				for (const item of arr) {
					await message.react(item.identifier).catch((err) => {
						console.log("testo\n\n");
						console.log(err, "\n");
						console.log(err.code, "\n\n");
						if (err.code == "EMOJI_TYPE" || err.code == 10014) {
							console.error(`Could not react with the ${item.identifier} emoji. Removing from saved list.`);
							const newArr = [...arr];
							newArr.splice(newArr.indexOf(item), 1);
							if (newArr.length == 0) newList.delete(tier);
							else newList.set(tier, newArr);
						} else console.error(err);
					});
					if (lastKey == tier && arr.indexOf(item) == arr.length - 1) return saveList(newList, sId);
				}
			}
		}
	},
	async deleteNotificationReactions(message, inputList){
		const ops = message.client.configs.get(message.guild.id);
		try {
			const notifyChannel = await message.guild.channels.fetch(ops.notifyReactionChannel);
			const existingMessages = await notifyChannel.messages.fetch({ limit: 10 }).then((ms) => ms.filter((msg) => !msg.pinned));
			if (inputList == "all") return notifyChannel.bulkDelete(existingMessages).catch(console.error);
			const deleteNames = inputList.map(v => v).flat().map((i) => i.name.replace(/-/g, "_"));
			for (const [k1, msg] of existingMessages) {
				const reactionsToDelete = msg.reactions.cache.filter((r) => deleteNames.includes(r.emoji.name));
				if (reactionsToDelete.size == msg.reactions.cache.size) {
					msg.delete().catch(console.error);
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
	async allNotificationServers(client, list) {
		for (const [k, config] of client.configs) {
			const server = await client.guilds.fetch(k);
			if (config.notifyReactionChannel) await module.exports.makeNotificationReactions(server, list);
			else continue;
			console.log(`Notifications loaded in ${server.name}`);
		}
		return;
	},
};

async function argsCheck(args, list) {
	let checkedArgs = args;
	if (list.size == 0) return checkedArgs;
	for (const item of list) {
		checkedArgs = checkedArgs.filter((v) => !item[1].includes(v));
		if (list.lastKey() == item[0]) return checkedArgs;
	}
}
async function pokeNavCheck(data, message, messageData, i, result) {
	const ops = message.client.configs.get(message.guild.id);
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
			pokenavChannel.awaitMessages({ filter, max: 1, time: 20000, errors: ["time"] }).then(async (resp) => {
				try {
					const emb = resp.first().embeds[0];
					const respTitle = emb.title;
					pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
					const eURL = emb.thumbnail?.url;
					if (respTitle == "Error") {
						console.log(`${mon} was not found by pokenav.`);
						messageData.push(`PokeNav could not find \`${mon}\`. Please try again for that boss or add manually using \`${ops.prefix}override\`.`);
						pushCheckLoop(data, message, messageData, i, result).then(([r, m]) => resolve([r, m]));
					} else {
						const tierLocation = respTitle.toLowerCase().indexOf("tier");
						const tier = respTitle.slice(tierLocation, respTitle.length - 1);
						const newMon = respTitle.slice(6, tierLocation - 2);
						pushCheckLoop(data, message, messageData, i, result, tier, newMon, eURL).then(([r, m]) => resolve([r, m]));
					}
				} catch (e) {
					return console.error("An unexpected error in ]notify. error:", e);
				}
			}).catch(() => {
				console.log(`${mon} took more than 20 seconds for pokenav to find...?`);
				messageData.push(`PokeNav did not respond quickly enough (or too quickly) for \`${mon}\`. Please try again for that boss.`);
				pushCheckLoop(data, message, messageData, i, result).then(([r, m]) => resolve([r, m]));
			});
		});
	});
}

async function pushCheckLoop(data, message, messageData, i, result, tier, newMon, eURL) {
	if (tier) {
		let group = result.get(tier);
		if (!group) group = [];
		group.push({ name: newMon, url: eURL });
		result.set(tier, group);
	}
	if (i == data.length - 1) {
		if (result.size > 0) {
			return [result, messageData];
		} else {
			return ["none", messageData];
		}
	} else {
		i++;
		return await pokeNavCheck(data, message, messageData, i, result);
	}
}

async function pokeNavOverrideCheck(boss, message) {
	const ops = message.client.configs.get(message.guild.id);
	const pokenavChannel = await message.guild.channels.fetch(ops.pokenavChannel);
	message.react("👀");
	console.log(`Checking ${boss} counters for tier`);
	await pokenavChannel.send(`<@428187007965986826> dex ${boss}`);
	const filter = m => {
		return m.author.id == 428187007965986826 && (m.embeds[0]?.thumbnail?.url.includes("pokenav.app") || m.embeds[0]?.title.toLowerCase().includes("error"));
	};
	let resp;
	try {
		resp = await pokenavChannel.awaitMessages({ filter, max: 1, time: 20000, errors: ["time"] });
	} catch {
		console.log(`${boss} took more than 20 seconds for pokenav to find...?`);
		message.reply(`PokeNav did not respond quickly enough (or too quickly) for \`${boss}\`. Please try again.`);
		return false;
	}
	try {
		const emb = resp.first().embeds[0];
		const respTitle = emb.title;
		pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
		const eURL = emb.thumbnail?.url;
		if (respTitle == "Error") {
			console.log(`${boss} was not found by pokenav.`);
			message.reply(`PokeNav could not find \`${boss}\`. Please try again for that boss.`);
			return false;
		} else {
			let newMon;
			if (respTitle.includes("✨")) {
				newMon = respTitle.slice(6, -2);
			} else {
				newMon = respTitle.slice(6);
			}
			return [newMon, eURL];
		}
	} catch (e) {
		return console.error("An unexpected error in ]notify. error:", e);
	}
}

function makeRoles(input, message) {
	console.log("Making/checking roles & rules");
  return new Promise((resolve) => {
		const ops = message.client.configs.get(message.guild.id);
    const pokenavChannel = message.guild.channels.cache.get(ops.pokenavChannel);
		for (const tier of input){
			for (const bossItem of tier[1]) {
				const bossName = bossItem.name;
				const roleName = "Notify" + bossName;
				const role = message.guild.roles.cache.find(r => r.name == roleName);
				if (!role) {
					console.log(`Creating role: ${roleName}.`);
					message.guild.roles.create({ name: roleName, mentionable: false }).then(() => {
						pokenavChannel.send(`<@428187007965986826> create notify-rule ${roleName} "boss:${bossName}"`).then((msg) => {
							msg.delete();
							if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
								resolve();
							}
						});
					}).catch();
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

async function deleteRoles(input, message) {
	console.log("Deleteing roles & rules");
	for (const tier of input){
		for (const bossItem of tier[1]) {
			const bossName = bossItem.name;
			const roleName = "Notify" + bossName;
			const role = message.guild.roles.cache.find(r => r.name == roleName);
			if (role) {
				console.log(`Deleting role: ${roleName}.`);
				const startDeleteTime = Date.now();
				await message.guild.roles.delete(role).then(() => {
					if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
						return;
					}
				}).catch((err) => {
					if (err.code == 500) {
						console.error(`[${dateToTime(new Date())}]: Error: I could not delete the ${roleName} role. Timeout`);
						message.reply(`I timed out after 3 tries on ${bossName}. Please try again for that boss.`);
						if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							return;
						}
					} else {
						console.error(`Error deleting ${roleName}`);
						console.error((Date.now() - startDeleteTime) / 1000, "seconds");
						console.error(role);
						throw err;
					}
				});
			} else {
				console.log(`Role: ${roleName} didn't exist.`);
				if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
					return;
				}
			}
		}
	}
}

async function makeEmoji(input, message) {
	const ops = message.client.configs.get(message.guild.id);
	const messageData = [];
	try {
		const emojiServer = await message.client.guilds.cache.get("994034906306969691");
		const allEmoji = await emojiServer.emojis.fetch(undefined, { force: true });
		for (const [k, v] of input) {
			for (const item of v) {
				const emojiName = item.name.replace(/-/g, "_");
				const emoji = allEmoji.find(e => e.name == emojiName);
				if (emoji) {
					console.log(`An Emoji named ${item.name} already existed on the emojiServer`);
					item.identifier = emoji.identifier;
				} else {
					console.log(`Creating an Emoji named ${emojiName} on the emojiServer`);
					const res = await emojiServer.emojis.create(item.url, item.name.replace(/-/g, "_")).then((e) => e.identifier).catch(err => err);
					if (res.message?.includes("image: Invalid image data")) {
						console.log(`${item.name} thumbnail was not available as an emoji.`);
						messageData.push(`There was no thumbnail for the emoji for \`${item.name}\`. Please add the emoji manually using \`${ops.prefix}override\`.`);
					} else if (res.code == 50035) {
						console.error(`I could not create an emoji for ${emojiName}. String validation regex. Tell Soul.`);
						console.error(res);
						messageData.push(`String regex issue for ${emojiName}. Please tell <@${dev}>`);
					} else if (res.code) {
						console.error(`Cache may have fail when making an emoji for ${emojiName}. It might have already existed...?`, res);
					} else {
						item.identifier = res;
					}
				}
				if (v.indexOf(item) == v.length - 1 && input.lastKey() == k) return messageData;
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
			const emojiName = item.name.replace(/-/g, "_");
			const emoji = allEmoji.find((e) => e.name == emojiName);
			await emojiServer.emojis.delete(emoji).then(() => console.log(`Deleted Emoji ${emojiName}`)).catch((e) => {
				if (e.code == "INVALID_TYPE") console.error(`Error: could not delete emoji ${emojiName} as it didn't exist...?`);
				else console.error(e);
			});
			if (v.indexOf(item) == item.length - 1 && input.lastKey() == k) return;
		}
	}
}

function saveList(newList, sId){
	newList.sort(sortList);
	serverLists.set(sId, newList);
	console.log("Updating saved list");
	module.exports.saveNotifyList(sId).then(() => {
		return;
	});
}

function loadPokeLookup() {
  const list = new Discord.Collection();
		return new Promise(function(resolve, reject) {
			new Promise((res) => {
				try {
					delete require.cache[require.resolve(`../server/pokemonLookup.json`)];
					res();
				} catch (e){
					if (e.code == "MODULE_NOT_FOUND") {
						// do nothing
						res();
					} else {
						reject(`Error thrown when loading pokemon lookup. Error: ${e}`);
						return;
					}
				}
			}).then(() => {
				try {
					const jsonList = require(`../server/pokemonLookup.json`);
					for (const g in jsonList) {
						list.set(g, jsonList[g]);
					}
					const bossAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					console.log(`pokemon lookup loaded. It contains ${list.size} pokemon.`);
					resolve(list);
				} catch (e) {
					if (e.code == "MODULE_NOT_FOUND") {
			      // testo
						fs.writeFile(path.resolve(__dirname, `../server/${folder}/notifyList.json`), JSON.stringify(Object.fromEntries(list)), (err) => {
							if (err){
								reject(`Error thrown when writing the notify list file. Error: ${err}`);
								return;
							}
							console.log("\nCould not find notifyList.json. Making a new one...");
							list = require(`../server/${folder}/notifyList.json`);
							serverLists.set(sId, list);
							lookup.set(sId, folder);
							resolve(list);
						});
					}	else {
						reject(`Error thrown when loading the notify list (2). Error: ${e}`);
						return;
					}
				}
			});
		});
}
function saveNotifyList(sId) {
		const folder = lookup.get(sId);
		return new Promise((resolve) => {
			fs.writeFile(path.resolve(__dirname, `../server/${folder}/notifyList.json`), JSON.stringify(Object.fromEntries(serverLists.get(sId))), (err) => {
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

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}

function sortList(v1, v2, k1, k2){
	if (k1 > k2) return 1;
	if (k1 < k2) return -1;
	else return 0;
}
