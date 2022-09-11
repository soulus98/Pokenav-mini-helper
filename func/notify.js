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
		checkTierAPI(checkedArgs, result, messageData, message);
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
		await module.exports.allNotificationServers(message.client, "make", newList);
		message.reply(`Notifications added.\n<#${message.client.configs.get(message.guild.id).notifyReactionChannel}>${(messageData?.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
	},
	async override(message, tier, args, type) {
		let bosses, emojis;
		if (type == "emoji") {
			emojis = args.map(i => i.slice(2, -1));
			bosses = emojis.map(i => i.split(":")[0]);
		} else {
			bosses = args;
		}
		const list = notifyList;
		console.log(`[${dateToTime(new Date())}]Beginning manual override for: ${bosses.join(", ")}`);
		const [checkedArgs, removed] = await argsCheck(bosses, list);
		if (hasDuplicates(checkedArgs)) throw ["dupe"];
		if (!checkedArgs.length) throw ["already"];
		const messageData = [];
		if (removed.length) messageData.push(`The following bosses were found in the saved list: \`${removed.join("`, `")}\``);
		message.react("👀");
		const arr = [];
		for (const boss of bosses) {
			let bossName = boss.toUpperCase().replace(/-/g, "_");
			if (bossName.includes("_") && !bossName.endsWith("_FORM")) bossName = bossName + "_FORM";
			const item = { name: bossName };
			if (type == "emoji") {
				const emoji = emojis[bosses.indexOf(boss)];
				item.identifier = emoji;
			}
			arr.push(item);
		}
		const result = new Discord.Collection();
		result.set(tier, arr);
		await makeRoles(result, message);
		if (type == "boss") {
			await makeEmoji(result, message);
		}
		if (!list.get(tier)) list.set(tier, arr);
		else {
			const newArr = list.get(tier);
			for (const b of arr) {
				newArr.push(b);
			}
			newArr.sort((a, b) => a.name - b.name);
			list.set(tier, newArr);
		}
		await module.exports.allNotificationServers(message.client, "make", list);
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
							const jsonList = require("../server/pokemonLookup.json");
							for (const g in jsonList) {
								list.set(g, jsonList[g]);
							}
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
		const guild = messageReaction.message.guild;
		const ops = messageReaction.client.configs.get(guild.id);
		try {
			const title = messageReaction.message.embeds[0]?.title;
			let tier;
			if (title.includes("1")) tier = "1";
			if (title.includes("3")) tier = "3";
			if (title.includes("4")) tier = "4";
			if (title.includes("&")) tier = "5";
			const emojiName = messageReaction.emoji.name;
			let newName = emojiName.replace(/(?<=^|[^a-z])[a-z]+(?=$|[^a-z])/gi,
				function(txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				});
			newName = newName.replace("_Form", "");
			const roleName = newName + "Raid";
			const tierArr = list.get(tier);
			if (!tierArr) return console.error(`[${guild.name}]: I could not find the "${tier}" tier in the list. Perhaps there are other message reactions in the channel`);
			if (tierArr.map(i => i.name).includes(emojiName.toUpperCase())) {
				const server = messageReaction.message.guild;
				const member = await server.members.fetch(user.id);
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${guild.name}]: [${dateToTime(new Date())}] Adding role ${role.name} to ${user.username}${user}`);
					member.roles.add(role.id).catch((e) => {
						console.error(`[${guild.name}]: [${dateToTime(new Date())}] Could not add ${roleName} to ${user.username}${user}. Error: ${e}`);
					});
				}	else {
					const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
					pokenavChannel.send(`<@&${ops.modRole}> I could not find a role while adding. Please tell Soul.`);
					console.error(`[${guild.name}]: [${dateToTime(new Date())}] An error occured. I could not find the ${roleName} role. Someone may have deleted it?`);
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
		const guild = messageReaction.message.guild;
		const ops = messageReaction.client.configs.get(guild.id);
		try {
			const title = messageReaction.message.embeds[0]?.title;
			let tier;
			if (title.includes("1")) tier = "1";
			if (title.includes("3")) tier = "3";
			if (title.includes("4")) tier = "4";
			if (title.includes("&")) tier = "5";
			const emojiName = messageReaction.emoji.name;
			let newName = emojiName.replace(/(?<=^|[^a-z])[a-z]+(?=$|[^a-z])/gi,
				function(txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				});
			newName = newName.replace("_Form", "");
			const roleName = newName + "Raid";
			const tierArr = list.get(tier);
			if (!tierArr) return console.error(`[${guild.name}]: I could not find the "${tier}" tier in the list. Perhaps there are other message reactions in the channel`);
			if (tierArr.map(i => i.name).includes(emojiName.toUpperCase())) {
				const server = messageReaction.message.guild;
				const member = await server.members.fetch(user.id);
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${guild.name}]: [${dateToTime(new Date())}] Removing role ${role.name} from ${user.username}${user}`);
					member.roles.remove(role.id).catch((e) => {
						console.error(`[${guild.name}]: [${dateToTime(new Date())}]: Could not remove ${roleName} from ${user.username}${user}. Error: ${e}`);
					});
				}	else {
					const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
					pokenavChannel.send(`<@&${ops.modRole}> I could not find a role while removing. Please tell Soul.`);
					console.error(`[${guild.name}]: [${dateToTime(new Date())}]: An error occured. I could not find the ${roleName} role. Someone may have deleted it?`);
				}
			} else {
				const pokenavChannel = await messageReaction.message.guild.channels.fetch(ops.pokenavChannel);
				pokenavChannel.send(`<@&${ops.modRole}> An emoji was not found in the saved list while removing. Please tell Soul.`);
				console.error(`[${guild.name}]: [${dateToTime(new Date())}]: An error occured. I could not find the ${emojiName} emoji in the list! An erroneous reaction?`);
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
			await module.exports.allNotificationServers(message.client, "delete", "all");
			await deleteRoles(list, message).catch(console.error);
			await deleteEmoji(list, message).catch(console.error);
			message.reply("Notifications removed.");
			return;
		}
		// const newArgs = [...args];
		const [unfound, removable] = await argsCheck(args, list);
		if (!removable.length) throw ["not found"];
		if (hasDuplicates(removable)) throw ["dupe"];
		const messageData = [];
		if (unfound.length) messageData.push(`The following bosses were not found in the saved list: \`${unfound.join("`, `")}\``);
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
		checkTierLocal(removable, result, list);
		await module.exports.allNotificationServers(message.client, "delete", result);
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
		message.reply(`Notifications removed.\n<#${message.client.configs.get(message.guild.id).notifyReactionChannel}>${(messageData?.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
	},
	async makeNotificationReactions(server, newList){
		const ops = server.client.configs.get(server.id);
		const notifyChannel = await server.channels.fetch(ops.notifyReactionChannel);
		if (!newList) newList = notifyList;
		const existingMessages = await notifyChannel.messages.fetch({ limit: 10 }).then((ms) => ms.filter((msg) => !msg.pinned));
		if (newList.size == 0) {
			notifyChannel.bulkDelete(existingMessages).catch(console.error);
			console.log(`\n[${server.name}]: Saving blank list`);
			module.exports.saveNotifyList();
			return;
		}
		console.log(`\n[${server.name}]: Checking and adding reactions`);
		let tiersArr = newList.map((v, k) => k);
		for (const [mId, message] of existingMessages) {
			if (!message.embeds[0] || !message.embeds[0].title) continue;
			const title = message.embeds[0].title;
			let tier;
			if (title.includes("1")) tier = "1";
			if (title.includes("3")) tier = "3";
			if (title.includes("4")) tier = "4";
			if (title.includes("&")) tier = "5";
			if (!tier) {
				console.error(`[${message.guild.name}]: I could not find a tier in the list for the "${title}" embed message. Perhaps there are other message reactions in the channel`);
				continue;
			}
			const bossArr = newList.get(tier);
			if (!bossArr) {
				console.log(`Deleting T${tier} message\n`);
				await message.delete();
				newList.delete(tier);
				if (existingMessages.lastKey() == tier) saveList(newList);
			} else {
				console.log(`Reacting to T${tier} message`);
				await makeReactions(message, tier, newList);
				tiersArr = tiersArr.filter((i) => i !== tier);
			}
		}
		if (!tiersArr.length) return saveList(newList);
		for (const tier of tiersArr) {
			console.log(`Sending a new T${tier} message and reacting`);
			const embed = new Discord.MessageEmbed()
			.setDescription("Click on a raid boss to be notified when a new raid is posted.\nClick it again to remove the notification.")
			.setColor(0xFF00FF);
			if (tier == 5) embed.setTitle("Legendary & Mega Raid Bosses");
			else embed.setTitle(`Tier ${tier} Raid Bosses`);
			const message = await notifyChannel.send({ embeds: [embed] });
			await makeReactions(message, tier, newList);
		}
		saveList(newList);
	},
	async deleteNotificationReactions(server, inputList){
		const ops = server.client.configs.get(server.id);
		try {
			const notifyChannel = await server.channels.fetch(ops.notifyReactionChannel);
			const existingMessages = await notifyChannel.messages.fetch({ limit: 10 }).then((ms) => ms.filter((msg) => !msg.pinned));
			if (inputList == "all") return notifyChannel.bulkDelete(existingMessages).catch(console.error);
			const deleteNames = inputList.map(v => v).flat().map((i) => i.name.toLowerCase());
			for (const [k1, msg] of existingMessages) {
				const reactionsToDelete = msg.reactions.cache.filter((r) => deleteNames.includes(r.emoji.name.toLowerCase()));
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
	async allNotificationServers(client, funct, list) {
		for (const [k, config] of client.configs) {
			if (!config.notifyReactionChannel) continue;
			const server = await client.guilds.fetch(k);
			if (funct == "make") await module.exports.makeNotificationReactions(server, list);
			if (funct == "delete") await module.exports.deleteNotificationReactions(server, list);
			else continue;
			console.log(`Notifications (re)loaded in ${server.name}`);
		}
		return;
	},
	async updateAPI(){
		pokemonLookup = new Discord.Collection();
		await fs.promises.unlink(path.resolve(__dirname, "../server/pokemonLookup.json")).catch(console.error);
		await module.exports.loadPokemonLookup().catch(console.error);
		return;
	},
	async searchAPI(value){
		const filtered = pokemonLookup.filter((v, k) => k.toLowerCase().includes(value.toLowerCase()));
		return filtered.map((v, k) => k);
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
	if (list.size == 0) return [checkedArgs, []];
	const found = [];
	for (const [tier, arr] of list) {
		for (const boss of checkedArgs) {
			if (arr.find(i => i.name == boss)) {
				found.push(boss);
			}
		}
		const unfound = checkedArgs.filter(i => !found.includes(i));
		if (list.lastKey() == tier) return [unfound, found];
	}
}

async function checkTierAPI(input, result, messageData, message) {
	const ops = message.client.configs.get(message.guild.id);
	for (const bossName of input) {
		if (!pokemonLookup.has(bossName)) {
			messageData.push(`Boss :${bossName} was not found in the API. Please update the API or use \`${ops.prefix}override\``);
			continue;
		}
		let rawTier = pokemonLookup.get(bossName).tiers[0];
		let guessTier = await discernGuessTier(rawTier);
		if (!guessTier || guessTier == "UNSET") {
			if (bossName.includes("_")) {
				rawTier = pokemonLookup.get(bossName.split("_")[0]).tiers[0];
				guessTier = await discernGuessTier(rawTier);
				if (!guessTier || guessTier == "UNSET") {
					messageData.push(`Boss :${bossName} has not yet been predicted to be a raid boss. Please update the API or use \`${ops.prefix}override\``);
					continue;
				}
			}
		}
		if (!result.has(guessTier)) result.set(guessTier, [{ name:bossName }]);
		else {
			result.get(guessTier).push({ name:bossName });
		}
	}
}

async function discernGuessTier(rawTier) {
	let guessTier;
	if (rawTier.includes("5")) guessTier = "5";
	else if (rawTier.includes("4")) guessTier = "4";
	else if (rawTier.includes("3")) guessTier = "3";
	else if (rawTier.includes("2")) guessTier = "2";
	else if (rawTier.includes("1")) guessTier = "1";
	else if (rawTier.includes("MEGA")) guessTier = "5";
	else if (rawTier.includes("ULTRA")) guessTier = "5";
	else if (rawTier.includes("UNSET")) guessTier = "UNSET";
	return guessTier;
}

async function checkTierLocal(input, result, list) {
	for (const bossName of input) {
		const tier = list.findKey(arr => arr.find(i => i.name == bossName));
		let array = result.get(tier);
		if (!array) array = [];
		array.push({ name: bossName });
		result.set(tier, array);
	}
}

async function makeRoles(input, message) {
	console.log("Making/checking roles & rules");
  const client = message.client;
  for (const [sId, config] of client.configs) {
    const server = await client.guilds.fetch(sId);
		const pokenavChannel = server.channels.cache.get(config.pokenavChannel);
		for (const tier of input) {
			for (const bossItem of tier[1]) {
				const name = bossItem.name.replace("_FORM", "");
				const newName = name.replace(/(?<=^|[^a-z])[a-z]+(?=$|[^a-z])/gi,
				function(txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				});
				const roleName = newName + "Raid";
				const bossName = name.replace(/_/g, "-");
				const role = server.roles.cache.find(r => r.name == roleName);
				if (!role) {
					console.log(`[${server.name}]: Creating role: ${roleName}.`);
					await server.roles.create({ name: roleName, mentionable: config.mentionable || false });
				} else {
					console.log(`[${server.name}]: Role: ${roleName} already exists.`);
				}
				const msg = await pokenavChannel.send(`<@428187007965986826> create notify-rule ${roleName} "boss:${bossName}"`);
				msg.delete();
				if (sId == client.configs.lastKey() && tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
					return;
				}
			}
		}
  }
}

async function deleteRoles(input, message) {
	console.log("Deleteing roles & rules");
	const client = message.client;
	for (const [sId] of client.configs) {
    const server = await client.guilds.fetch(sId);
		for (const tier of input){
			for (const bossItem of tier[1]) {
				const bossName = bossItem.name;
				const newName = bossName.replace(/(?<=^|[^a-z])[a-z]+(?=$|[^a-z])/gi,
				function(txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				});
				const roleName = newName + "Raid";
				const role = server.roles.cache.find(r => r.name == roleName);
				if (role) {
					console.log(`[${server.name}]: Deleting role: ${roleName}.`);
					const startDeleteTime = Date.now();
					await server.roles.delete(role).then(() => {
						if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							return;
						}
					}).catch((err) => {
						if (err.code == 500) {
							console.error(`[${server.name}]: [${dateToTime(new Date())}]: Error: I could not delete the ${roleName} role. Timeout`);
							message.reply(`I timed out after 3 tries on ${bossName}. Please try again for that boss.`);
							if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
								return;
							}
						} else {
							console.error(`[${server.name}]: Error deleting ${roleName}`);
							console.error((Date.now() - startDeleteTime) / 1000, "seconds");
							console.error(role);
							throw err;
						}
					});
				} else {
					console.log(`[${server.name}]: Role: ${roleName} didn't exist.`);
					if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
						return;
					}
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
				let lookupName = item.name;
				let num = pokemonLookup.get(lookupName)?.num;
				if (!num || isNaN(num) || num < 1) {
					if (lookupName.includes("_")) lookupName = lookupName.split("_")[0];
					num = pokemonLookup.get(lookupName)?.num;
					if (!num || isNaN(num) || num < 1) {
						console.error(`${item.name} num not good num (<1 !num or NaN).`);
						console.error("num = ", num);
						messageData.push(`I could not find the correct URL for this mega pokemon: ${item.name}. Either update the \`${ops.prefix}api update\` or use \`${ops.prefix}override\`.`);
						if (v.indexOf(item) == v.length - 1 && input.lastKey() == k) return messageData;
						else continue;
					}
				}
				if (num > 8000) {
					console.error(`${item.name} mega not found (>=8000).`);
					messageData.push(`I could not find the correct URL for this mega pokemon: ${item.name}. Either update the \`${ops.prefix}api update\` or use \`${ops.prefix}override\`.`);
					if (v.indexOf(item) == v.length - 1 && input.lastKey() == k) return messageData;
					else continue;
				}
				if (num < 9) num = "00" + num;
				else if (num < 99) num = "0" + num;
				const urlName = item.name.toLowerCase().replace(/_/g, "-").replace("-form", "");
				const emoji = allEmoji.find(e => e.name.toLowerCase() == item.name.toLowerCase());
				const emojiName = item.name.replace(/(?<=^|[^a-z])[a-z]+(?=$|[^a-z])/gi,
				function(txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				});
				const url = `https://static.pokenav.app/images/pokemon-icons/png/128/${num}-${urlName}.png`;
				const backupUrl = `https://static.pokenav.app/images/pokemon-go-icons/png/128/${num}-${urlName}.png`;
				if (emoji) {
					console.log(`An Emoji named ${item.name} already existed on the emojiServer`);
					item.identifier = emoji.identifier;
				} else {
					console.log(`Creating an Emoji named ${item.name} on the emojiServer`);
					const res = await emojiServer.emojis.create(url, emojiName).then((e) => e.identifier).catch(err => err);
					if (res.message?.includes("image: Invalid image data") || res.code == "EMOJI_TYPE") {
						const res2 = await emojiServer.emojis.create(backupUrl, emojiName).then((e) => e.identifier).catch(err => err);
						if (res2.message?.includes("image: Invalid image data") || res.code == "EMOJI_TYPE") {
							console.log(`${item.name} thumbnail was not available as an emoji.`);
							messageData.push(`There was no thumbnail for the emoji for \`${item.name}\`. Please add the emoji manually using \`${ops.prefix}override\`.`);
						} else if (res2.message) {
							console.error(`I could not create an emoji for ${item.name}. Unknown error. Tell Soul.`);
							console.error("Error 1:");
							console.error(res);
							console.error("Error 2:");
							console.error(res2);
							messageData.push(`Unknown Emoji ${item.name}. Please tell <@${dev}>`);
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
			const emoji = allEmoji.find((e) => e.name.toLowerCase() == emojiName.toLowerCase());
			await emojiServer.emojis.delete(emoji).then(() => console.log(`Deleted Emoji ${emojiName}`)).catch((e) => {
				if (e.code == "INVALID_TYPE") console.error(`Error: could not delete emoji ${emojiName} as it didn't exist...?`);
				else console.error(e);
			});
			if (v.indexOf(item) == item.length - 1 && input.lastKey() == k) return;
		}
	}
}

async function makeReactions(message, tier, newList) {
	const reactionCache = message.reactions.cache;
	const reactionEmojiIds = reactionCache.map(r => r.emoji.identifier);
	const bossArr = newList.get(tier);
	const arrEmojiIds = bossArr.map(i => i.identifier);
	const deleteArr = reactionEmojiIds.filter(i => !arrEmojiIds.includes(i));
	const foundArr = reactionEmojiIds.filter(i => arrEmojiIds.includes(i));
	const createArr = arrEmojiIds.filter(i => !reactionEmojiIds.includes(i));
	for (const id of deleteArr) {
		const re = reactionCache.find(r => r.emoji.identifier == id);
		await re.remove();
	}
	for (const id of createArr) {
		await message.react(id).catch((err) => {
			console.error(err.code, "\n\n");
			if (err.code == "EMOJI_TYPE" || err.code == 10014) {
				console.error(`Could not react with the ${id} emoji. Removing from saved list.`);
				const bossName = newList.find(i => i.identifier == id).name;
				const newArr = [...bossArr];
				newArr.splice(newArr.indexOf(bossName), 1);
				if (newArr.length == 0) newList.delete(tier);
				else newList.set(tier, newArr);
			} else console.error(err);
		});
	}
	console.log(`${(foundArr.length) ? `Found existing reactions: ${foundArr.join(", ")}\n` : ""}${(createArr.length) ? `Created new reactions: ${createArr.join(", ")}\n` : ""}${(deleteArr.length) ? `Deleted unintended reactions: ${deleteArr.join(", ")}\n` : ""}`);
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
	const list = new Discord.Collection();
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
					list.set(item.pokemonId, { num: item.pokedex.pokemonNum });
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
					const raidObj = JSON.parse(rBody);
					for (const tier of raidObj.tiers) {
						if (tier.raids.length == 0) continue;
						for (const raid of tier.raids) {
							let item = list.get(raid.pokemon);
							if (item == undefined) item = { tiers: [], num: 0 };
							if (item.tiers == undefined) item.tiers = [];
							item.tiers.push(tier.tier);
							list.set(raid.pokemon, item);
						}
					}
					resolve(list);
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
