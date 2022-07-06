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
		console.log(result);
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
	checkButtonInput(interaction){
		return new Promise((resolve) => {
			const val = interaction.customId;
			if (list.some((arr) => arr.includes(val))) {
				resolve(true);
				buttonInput(interaction);
			} else resolve(false);
		});
	},
	clearNotify(message, args){
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
					// list.forEach((arr, k) => {
					// 	if (result.has(k)) {
					// 		const newArr = arr.filter((i) => !result.get(k).includes(i));
					// 		if (newArr.length) {
					// 			newList.set(k, newArr);
					// 		}
					// 	} else {
					// 		newList.set(k, arr);
					// 	}
					// });
					// list = newList;
					// console.log("Updating saved list");
					// module.exports.saveNotifyList().then(() => {
					// 	return;
					// });
					// message.reply(`Notifications removed.${(messageData.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
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
		else throw "Could not load new notification reaction message";
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
				console.log(`Reacting to ${tier}`);
				const message = await notifyChannel.messages.fetch(existingIds.get(tier));
				for (const item of arr) {
					message.react(item.identifier);
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
		const notifyChannel = await message.guild.channels.fetch(ops.notifyReactionChannel);
		const existingMessages = await notifyChannel.messages.fetch({ limit: 6 }).then((ms) => ms.filter((msg) => !msg.pinned));
		const deleteNames = inputList.map(v => v).flat().map((i) => i.name);
		for (const msg of existingMessages) {
			const reactionsToDelete = msg.reactions.cache.filter((r) => deleteNames.includes(r.emoji.identifier));
			reactionsToDelete.forEach(async(item) => {
				item.remove();
				if (reactionsToDelete.lastKey() == item) {
					if (await msg.fetch().reactions.cache.size) {

					}
				}
			});
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
				messageData.push(`PokeNav did not respond quickly enough for \`${mon}\`. Please try again for that boss.`);
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
				const boss = bossItem.name;
				const role = message.guild.roles.cache.find(r => r.name == boss);
				if (!role) {
					console.log(`Creating role: ${boss}.`);
					message.guild.roles.create({ name: boss }).then(() => {
						pokenavChannel.send(`<@428187007965986826> create notify-rule ${boss} "boss:${boss}"`).then((msg) => {
							msg.delete();
							if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
								resolve();
							}
						});
					});
				} else {
					console.log(`Role: ${boss} already exists.`);
					pokenavChannel.send(`<@428187007965986826> create notify-rule ${boss} "boss:${boss}"`).then((msg) => {
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
				const boss = bossItem.name;
				const role = message.guild.roles.cache.find(r => r.name == boss);
				if (role) {
					console.log(`Deleting role: ${boss}.`);
					message.guild.roles.delete(role).then(() => {
						if (tier[1].indexOf(bossItem) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							resolve();
						}
					});
				} else {
					console.log(`Role: ${boss} didn't exist.`);
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
		const emojiServer = message.client.guilds.cache.get("994034906306969691");
		for (const [k, v] of input) {
			for (const item of v) {
				const emoji = emojiServer.emojis.cache.find(e => e.name == item.name);
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

async function buttonInput(interaction){
	const val = interaction.customId;
	const member = await interaction.member.fetch();
	const role = await interaction.guild.roles.fetch().then(roles => roles.find(r => r.name == val));
	if (!member.roles.cache.has(role.id)) {
		member.roles.add(role).then(() => {
			interaction.reply({ content: `Notifications activated for: \`${val}\`.`, ephemeral:true });
			return;
		});
	} else {
		member.roles.remove(role).then(() => {
			interaction.reply({ content: `Notifications **disabled** for: \`${val}\`.`, ephemeral:true });
			return;
		});
	}
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}
