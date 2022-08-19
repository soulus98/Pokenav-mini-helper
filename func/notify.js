/* eslint max-nested-callbacks: 0 */
const Discord = require("discord.js"),
			fs = require("fs"),
			path = require("path"),
			{ errorMessage, dateToTime, dev } = require("./misc.js");
let notifyList = new Discord.Collection(),
		pokemonLookup = new Discord.Collection();


module.exports = {
	async notify(message, args) {
		const list = notifyList;
		console.log(`[${dateToTime(new Date())}]Beginning notification workflow for: ${args.join(", ")}`);
		const [checkedArgs, removed] = await argsCheck(args, list);
		if (hasDuplicates(checkedArgs)) throw ["dupe"];
		if (!checkedArgs.length) throw ["already"];
		const messageData = [];
		if (removed.length) messageData.push(`The following bosses were found in the saved list: \`${removed.join("`, `")}\``);
		message.react("👀");
		const result = new Discord.Collection();
		checkTier(checkedArgs, result, messageData, message);
		if (messageData.length == args.length) throw ["none", messageData];
		// const [result, md] = await pokeNavCheck(checkedArgs, message);
		// md.forEach((item) => messageData.push(item));
		// if (typeof result == "string") throw [result, messageData];
		for (const [k, v] of result) {
			if (hasDuplicates(v.map(i => i.name))) throw ["dupe", k];
		}
		const md2 = await makeEmoji(result, message).catch(console.error);
		md2.forEach((item) => messageData.push(item));
		if (messageData.length == args.length) throw ["none", messageData];
		await makeRoles(result, message).catch(console.error);
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
		const list = notifyList;
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
	loadNotifyList() {
		let list = new Discord.Collection();
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
					console.log(`Notification list loaded. It contains ${list.size} tiers with ${bossAmount} bosses.`);
					notifyList = list;
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
							notifyList = list;
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
			fs.writeFile(path.resolve(__dirname, "../server/notifyList.json"), JSON.stringify(Object.fromEntries(notifyList)), (err) => {
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
	loadPokemonLookup() {
		let list = new Discord.Collection();
		return new Promise(function(resolve, reject) {
			new Promise((res) => {
				try {
					delete require.cache[require.resolve("../server/pokemonLookup.json")];
					res();
				} catch (e){
					if (e.code == "MODULE_NOT_FOUND" || e.code == "ENOENT") {
						// do nothing
						res();
					} else {
						reject(`Error thrown when loading pokemon lookup. Error: ${e}`);
						return;
					}
				}
			}).then(async () => {
				try {
					const jsonList = require("../server/pokemonLookup.json");
					for (const g in jsonList) {
						list.set(g, jsonList[g]);
					}
					console.log(`\nPokemon lookup loaded. It contains ${list.size} pokemon (and forms etc).`);
					pokemonLookup = list;
					resolve(list);
				} catch (e) {
					if (e.code == "MODULE_NOT_FOUND" || e.code == "ENOENT") {
					console.log("\nCould not find pokemonLookup.json. Making a new one...");
						list = await loadAndFormatAPI();
						fs.writeFile(path.resolve(__dirname, "../server/pokemonLookup.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
							if (err){
								reject(`Error thrown when writing the pokemon lookup file. Error: ${err}`);
								return;
							}
							list = require("../server/pokemonLookup.json");
							pokemonLookup = list;
							resolve(list);
						});
					}	else {
						reject(`Error thrown when loading the pokemon lookup (2). Error: ${e}\nCode: ${e.code}`);
						return;
					}
				}
			});
		});
	},
	async addReactionRole(messageReaction, user){
		const list = notifyList;
		const ops = messageReaction.client.configs.get(messageReaction.message.guild.id);
		try {
			const tier = messageReaction.message.embeds[0]?.footer.text;
			const emojiName = messageReaction.emoji.name;
			const roleName = emojiName + "Raid";
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
		const list = notifyList;
		const ops = messageReaction.client.configs.get(messageReaction.message.guild.id);
		try {
			const tier = messageReaction.message.embeds[0]?.footer.text;
			const emojiName = messageReaction.emoji.name;
			const roleName = emojiName + "Raid";
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
		const list = notifyList;
		console.log(`[${dateToTime(new Date())}]Clearing notification workflow for: ${args.join(", ")}`);
		message.react("👀");
		if (args[0].toLowerCase() == "all") {
			notifyList = new Discord.Collection();
			await module.exports.deleteNotificationReactions(message, "all");
			await deleteRoles(list, message).catch(console.error);
			await deleteEmoji(list, message).catch(console.error);
			message.reply("Notifications removed.");
			return;
		}
		// const newArgs = [...args];
		const [unFound, removable] = await argsCheck(args, list);
		if (!removable.length) throw ["not found"];
		if (hasDuplicates(removable)) throw ["dupe"];
		const messageData = [];
		if (unFound.length) messageData.push(`The following bosses were not found in the saved list: \`${unFound.join("`, `")}\``);
		// const tempList = new Discord.Collection();
		// for (const boss of args) {
		// 	const lcBoss = boss.toLowerCase();
		// 	for (const [tier, group] of list) {
		// 		const lcGroupNames = group.map(i => i.name).map(i => i.toLowerCase());
		// 		if (lcGroupNames.includes(lcBoss)) {
		// 			const realTierName = tier;
		// 			const realBoss = group[lcGroupNames.indexOf(lcBoss)];
		// 			const tempGroup = tempList.get(tier);
		// 			if (tempGroup) {
		// 				tempGroup.push(realBoss);
		// 				tempList.set(realTierName, tempGroup);
		// 			} else tempList.set(realTierName, [realBoss]);
		// 			newArgs.splice(newArgs.indexOf(boss), 1);
		// 		}
		// 	}
		// }
		// if (newArgs.length) [result, messageData] = await pokeNavCheck(newArgs, message);
		// if (result?.size) {
		// 	for (const [tier, group] of result) {
		// 		const tempGroup = tempList.get(tier);
		// 		let newGroup = group;
		// 		if (tempGroup) newGroup = group.concat(tempGroup).sort((a, b) => a.name - b.name);
		// 		tempList.set(tier, newGroup);
		// 	}
		// }
		// result = tempList;
		const result = new Discord.Collection();
		checkTier(removable, result, messageData, message);
		await module.exports.deleteNotificationReactions(message, result);
		const newList = new Discord.Collection();
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
		await deleteEmoji(result, message).catch(console.error);
		await deleteRoles(result, message).catch(console.error);
		newList.sort(sortList);
		notifyList = newList;
		console.log("Updating saved list");
		module.exports.saveNotifyList().then(() => {
			return;
		});
		message.reply(`Notifications removed.${(messageData?.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
	},
	async makeNotificationReactions(server, newList){
		const ops = server.client.configs.get(server.id);
		const notifyChannel = await server.channels.fetch(ops.notifyReactionChannel);
		if (!newList) newList = notifyList;
		const existingMessages = await notifyChannel.messages.fetch({ limit: 10 }).then((ms) => ms.filter((msg) => !msg.pinned));
		if (newList.size == 0) {
			notifyChannel.bulkDelete(existingMessages).catch(console.error);
			console.log("Saving blank list");
			module.exports.saveNotifyList();
			return;
		}
		const existingIds = new Discord.Collection;
		existingMessages.forEach((item, k) => {
			if (item.embeds[0]) existingIds.set(item.embeds[0].footer.text, k);
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
				if (lastKey == tier) saveList(newList);
			} else {
				if (existingIds.has(tier)) {
					console.log(`Reacting to T${tier} message`);
					message = await notifyChannel.messages.fetch(existingIds.get(tier));
				} else {
					console.log(`Sending a new T${tier} message and reacting`);
					const embed = new Discord.MessageEmbed()
					.setDescription("Click on a raid boss to be notified when a new raid is posted.\nClick it again to remove the notification.")
					.setColor(0xFF00FF)
					.setFooter({ text: tier });
					if (tier == 5) embed.setTitle("Legendary & Mega Raid Bosses");
					else embed.setTitle(`Tier ${tier} Raid Bosses`);
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
					if (lastKey == tier && arr.indexOf(item) == arr.length - 1) return saveList(newList);
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
			const deleteNames = inputList.map(v => v).flat().map((i) => i.name);
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
	async updateAPI(){
		pokemonLookup = new Discord.Collection();
		await fs.promises.unlink(path.resolve(__dirname, "../server/pokemonLookup.json")).catch(console.error);
		await module.exports.loadPokemonLookup().catch(console.error);
		return;
	},
};

async function argsCheck(args, list) {
	const upperArgs = args.map(name => name.toUpperCase());
	const checkedArgs = [];
	for (let name of upperArgs) {
		if (name.includes("-")){
			const splitName = name.split("-");
			const firstSort = ["2022", "2023", "2024", "2025", "X", "Y"];
			const secondSort = ["ALOLA", "ALOLAN", "GALARIAN", "GALAR", "HISUIAN", "HISUI", "SPEED", "ATTACK", "DEFENCE", "HERO", "BLACK", "WHITE", "BURN", "DOUSE", "SHOCK", "CHILL", "ALTERED", "ORIGIN", "INCARNATE", "THERIAN", "A", "COSTUME", "FEMALE", "MALE", "SPRING"];
			splitName.sort((a, b) => {
				if (firstSort.includes(a)) return 1;
				if (firstSort.includes(b)) return -1;
				if (a == "MEGA") return 1;
				if (b == "MEGA") return -1;
				if (secondSort.includes(a)) return 1;
				if (secondSort.includes(b)) return -1;
				return 0;
			});
			if (!splitName.includes("MEGA")) splitName.push("FORM");
			if (splitName.includes("ALOLAN")) splitName[splitName.indexOf("ALOLAN")] = "ALOLA";
			if (splitName.includes("GALAR")) splitName[splitName.indexOf("GALAR")] = "GALARIAN";
			if (splitName.includes("HISUI")) splitName[splitName.indexOf("HISUI")] = "HISUIAN";
			name = splitName.join("_");
		}
		checkedArgs.push(name);
	}
	const removed = [];
	if (list.size == 0) return [checkedArgs, removed];
	for (const [tier, arr] of list) {
		for (const boss of checkedArgs) {
			if (arr.find(i => i.name == boss)) {
				checkedArgs.splice(checkedArgs.indexOf(boss));
				removed.push(boss);
			}
		}
		if (list.lastKey() == tier) return [checkedArgs, removed];
	}
}

async function checkTier(input, result, messageData, message) {
	const ops = message.client.configs.get(message.guild.id);
	for (const bossName of input) {
		if (!pokemonLookup.has(bossName)) {
			messageData.push(`Boss :${bossName} was not found in the API. Please update the API or use \`${ops.prefix}override\``);
			continue;
		}
		const rawTier = pokemonLookup.get(bossName).tiers[0];
		let guessTier = 0;
		if (rawTier.includes("5")) guessTier = "5";
		else if (rawTier.includes("4")) guessTier = "4";
		else if (rawTier.includes("3")) guessTier = "3";
		else if (rawTier.includes("2")) guessTier = "2";
		else if (rawTier.includes("1")) guessTier = "1";
		else if (rawTier.includes("MEGA")) guessTier = "5";
		else if (rawTier.includes("ULTRA")) guessTier = "5";
		else if (rawTier.includes("UNSET")) {
			messageData.push(`Boss :${bossName} has not yet been predicted to be a raid boss. Please update the API or use \`${ops.prefix}override\``);
			continue;
		}
		if (!result.has(guessTier)) result.set(guessTier, [{ name:bossName }]);
		else {
			result.get(guessTier).push({ name:bossName });
		}
	}
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
				const bossName = bossItem.name.replace("_FORM", "");
				const roleName = bossName + "Raid";
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
			const roleName = bossName + "Raid";
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
				let num = pokemonLookup.get(item.name).num;
				if (num > 8000) {
					console.log(`${item.name} mega not found (>8000).`);
					messageData.push(`I could not find the correct URL for this mega pokemon: ${item.name}. The API is likely out of date.`); //todo update api command
					if (v.indexOf(item) == v.length - 1 && input.lastKey() == k) return messageData;
					else continue;
				}
				if (num < 9) num = "00" + num;
				else if (num < 99) num = "0" + num;
				const urlName = item.name.toLowerCase().replace(/_/g, "-").replace("-form", "");
				const emoji = allEmoji.find(e => e.name == item.name);
				const url = `https://static.pokenav.app/images/pokemon-icons/png/128/${num}-${urlName}.png`;
				const backupUrl = `https://static.pokenav.app/images/pokemon-go-icons/png/128/${num}-${urlName}.png`;
				if (emoji) {
					console.log(`An Emoji named ${item.name} already existed on the emojiServer`);
					item.identifier = emoji.identifier;
				} else {
					console.log(`Creating an Emoji named ${item.name} on the emojiServer`);
					const res = await emojiServer.emojis.create(url, item.name).then((e) => e.identifier).catch(err => err);
					if (res.message?.includes("image: Invalid image data") || res.code == "EMOJI_TYPE") {
						const res2 = await emojiServer.emojis.create(backupUrl, item.name).then((e) => e.identifier).catch(err => err);
						if (res2.message?.includes("image: Invalid image data") || res.code == "EMOJI_TYPE") {
							console.log(`${item.name} thumbnail was not available as an emoji.`);
							messageData.push(`There was no thumbnail for the emoji for \`${item.name}\`. Please add the emoji manually using \`${ops.prefix}override\`.`);
						}
					} else if (res.code == 50035) {
						console.error(`I could not create an emoji for ${item.name}. String validation regex. Tell Soul.`);
						console.error(res);
						messageData.push(`String regex issue for ${item.name}. Please tell <@${dev}>`);
					} else if (res.code) {
						console.error(`Cache may have fail when making an emoji for ${item.name}. It might have already existed...?`, res);
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
			const emojiName = item.name;
			const emoji = allEmoji.find((e) => e.name == emojiName);
			await emojiServer.emojis.delete(emoji).then(() => console.log(`Deleted Emoji ${emojiName}`)).catch((e) => {
				if (e.code == "INVALID_TYPE") console.error(`Error: could not delete emoji ${emojiName} as it didn't exist...?`);
				else console.error(e);
			});
			if (v.indexOf(item) == item.length - 1 && input.lastKey() == k) return;
		}
	}
}

function saveList(newList){
	newList.sort(sortList);
	notifyList = newList;
	console.log("Updating saved list");
	module.exports.saveNotifyList().then(() => {
		return;
	});
}

function loadAndFormatAPI() {
  return new Promise((resolve) => {
  const https = require("https");
	console.log("Loading pokebattler/pokemon API...");
	const options = {
		hostname: "fight.pokebattler.com",
		port: 443,
		path: "/pokemon",
		method: "GET",
	};

	const req = https.request(options, res => {
		console.log("Loaded pokemon");
		if (res.statusCode != 200) console.log(`error...? statusCode: ${res.statusCode}`);
		let body = "";
		res.on("data", d => {
			body += d;
		});

		res.on("end", () => {
			const apiObj = JSON.parse(body);
			for (const item of apiObj.pokemon) {
				try {
					if (item.pokemonId.includes("SHADOW_FORM")) continue;
					pokemonLookup.set(item.pokemonId, { num: item.pokedex.pokemonNum });
				} catch (e) {
					console.log("failed to do: ", item);
				}
			}

			const raidOptions = {
				hostname: "fight.pokebattler.com",
				port: 443,
				path: "/raids",
				method: "GET",
			};
			console.log("Loading pokebattler/raids API...");
			const raidReq = https.request(raidOptions, raidRes => {
				console.log("Loaded raids");
				if (raidRes.statusCode != 200) console.log(`error...? statusCode: ${raidRes.statusCode}`);
				let rBody = "";

				raidRes.on("data", d => {
					rBody += d;
				});

				raidRes.on("end", () => {
					console.log("loaded raids");
					const raidObj = JSON.parse(rBody);
					for (const tier of raidObj.tiers) {
						if (tier.raids.length == 0) continue;
						for (const raid of tier.raids) {
							let item = pokemonLookup.get(raid.pokemon);
							if (item == undefined) item = { tiers: [], num: 0 };
							if (item.tiers == undefined) item.tiers = [];
							item.tiers.push(tier.tier);
							pokemonLookup.set(raid.pokemon, item);
						}
					}
					resolve(pokemonLookup);
				});
			});
			raidReq.on("error", error => {
				console.error(error);
			});

			raidReq.end();
		});
	});

	req.on("error", error => {
		console.error(error);
	});

	req.end();
	});
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}

function sortList(v1, v2, k1, k2){
	if (k1 > k2) return 1;
	if (k1 < k2) return -1;
	else return 0;
}
