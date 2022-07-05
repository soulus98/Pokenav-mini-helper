/* eslint max-nested-callbacks: 0 */
const Discord = require("discord.js"),
			fs = require("fs"),
			path = require("path"),
			{ errorMessage, dateToTime } = require("../func/misc.js");
let list = new Discord.Collection();


module.exports = {
	notify(message, args) {
		return new Promise((resolve, reject) => {
			if (hasDuplicates(args)) return reject(["dupe"]);
			console.log(`[${dateToTime(new Date())}]Beginning notification workflow for: ${args.join(", ")}`);
			argsCheck(args).then((checkedArgs) => {
				if (!checkedArgs.length) return reject(["already"]);
				const messageData = [];
				const removedArgs = args.filter((v) => !checkedArgs.includes(v));
				if (removedArgs.length) messageData.push(`The following bosses were found in the saved list: \`${removedArgs.join("`, `")}\``);
				pokeNavCheck(checkedArgs, message).then(async ([result, md]) => {
					for (const [k, v] of result) {
						if (hasDuplicates(v)) return reject(["dupe", k]);
					}
					md.forEach((item) => messageData.push(item));
					if (typeof result == "string") return reject([result, messageData]);
					roleMake(result, message).then(async () => {
						const newList = new Discord.Collection;
						list.forEach((arr, key) => {
							if (result.has(key)) {
								const resultArr = result.get(key);
								const newArr = arr.concat(resultArr).sort();
								newList.set(key, newArr);
							} else {
								newList.set(key, arr);
							}
						});
						result.forEach((arr, key) => {
							if (!list.has(key)) {
								newList.set(key, arr.sort());
							}
						});
						module.exports.deleteAndMakeMessages(message, newList).then(() => {
							message.reply(`Notifications added.${(messageData.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
						}).catch((err) => {
							message.reply(err);
							console.error(err);
						});
					});
				});
			});
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
				roleDelete(list, message).then(() => {
					list = new Discord.Collection();
					module.exports.deleteAndMakeMessages(message, list).then(() => {
						message.reply("Notifications removed.");
						resolve();
					});
				});
				return;
			}
			if (hasDuplicates(args)) return reject(["dupe"]);
			pokeNavCheck(args, message).then(async ([result, messageData]) => {
				roleDelete(result, message).then(() => {
					const newList = new Discord.Collection();
					list.forEach((arr, k) => {
						if (result.has(k)) {
							const newArr = arr.filter((i) => !result.get(k).includes(i));
							if (newArr.length) {
								newList.set(k, newArr);
							}
						} else {
							newList.set(k, arr);
						}
					});
					module.exports.deleteAndMakeMessages(message, newList).then(() => {
						message.reply(`Notifications removed.${(messageData.length) ? `\n\nErrors:\n• ${messageData.join("\n• ")}` : ""}`);
					}).catch((err) => {
						message.reply(err);
						console.error(err);
					});
				});
			});
		});
	},
	async deleteAndMakeMessages(input, newList) {
		let notifyChannel;
		if (input instanceof Discord.Message) notifyChannel = await input.guild.channels.fetch(ops.notifyReactionChannel);
		else if (input instanceof Discord.Guild) notifyChannel = await input.channels.fetch(ops.notifyReactionChannel);
		else throw "Could not load new notification reaction message";
		if (!newList) newList = list;
		const existingButtons = await notifyChannel.messages.fetch({ limit: 6 }).then((ms) => ms.filter((msg) => !msg.pinned));
		return notifyChannel.bulkDelete(existingButtons).then(() => {
			if (newList.size == 0) {
				console.log("Saving blank list");
				module.exports.saveNotifyList();
				return;
			}
			console.log("Constructing buttons");
			newList.forEach(async (arr, key) => {
				if (arr.length > 25) {
					throw "I cannot currently process more than 25 bosses per tier. Please clear before trying again.";
				}
				const embed = new Discord.MessageEmbed()
				.setTitle(key)
				.setDescription(`Click on a ${key} to be notified when a new raid is posted.\nClick it again to remove the notification.`);
				let buttonArr = [];
				const rowArr = [];
				for (const boss of arr) {
					if (buttonArr.length == 5) {
						rowArr.push(new Discord.MessageActionRow()
						.addComponents(buttonArr));
						buttonArr = [];
					}
					const button = new Discord.MessageButton()
					.setCustomId(boss)
					.setLabel(boss)
					.setStyle("PRIMARY");
					buttonArr.push(button);
					if (arr.indexOf(boss) == arr.length - 1) {
						rowArr.push(new Discord.MessageActionRow()
						.addComponents(buttonArr));
					}
				}
				console.log(`Sending ${key} button message`);
				notifyChannel.send({ components: rowArr, embeds: [embed] }).then(() => {
					if (newList.lastKey() == key) {
						list = newList;
						console.log("Updating saved list");
						module.exports.saveNotifyList().then(() => {
							return;
						});
					}
				});
			});
		}).catch((err) => console.error(err));
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
					const respTitle = resp.first().embeds[0].title;
					pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
					if (respTitle == "Error") {
						console.log(`${mon} was not found by pokenav.`);
						messageData.push(`PokeNav could not find \`${mon}\`. Please try again for that boss.`);
					} else {
						const tierLocation = respTitle.toLowerCase().indexOf("tier");
						const tier = respTitle.slice(tierLocation, respTitle.length - 1);
						const newMon = respTitle.slice(6, tierLocation - 2);
						let group = result.get(tier);
						if (!group) group = [];
						group.push(newMon);
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

function roleMake(input, message) {
	console.log("Making/checking roles & rules");
  return new Promise((resolve) => {
    const pokenavChannel = message.guild.channels.cache.get(ops.pokenavChannel);
		for (const tier of input){
			for (const boss of tier[1]) {
				const role = message.guild.roles.cache.find(r => r.name == boss);
				if (!role) {
					console.log(`Creating role: ${boss}.`);
					message.guild.roles.create({ name: boss }).then(() => {
						pokenavChannel.send(`<@428187007965986826> create notify-rule ${boss} "boss:${boss}"`).then((msg) => {
							msg.delete();
							if (tier[1].indexOf(boss) == tier[1].length - 1 && input.lastKey() == tier[0]) {
								resolve();
							}
						});
					});
				} else {
					console.log(`Role: ${boss} already exists.`);
					pokenavChannel.send(`<@428187007965986826> create notify-rule ${boss} "boss:${boss}"`).then((msg) => {
						msg.delete();
						if (tier[1].indexOf(boss) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							resolve();
						}
					});
				}
			}
		}
  });
}

function roleDelete(input, message) {
	console.log("Deleteing roles & rules");
	return new Promise((resolve) => {
    const pokenavChannel = message.guild.channels.cache.get(ops.pokenavChannel);
		for (const tier of input){
			for (const boss of tier[1]) {
				const role = message.guild.roles.cache.find(r => r.name == boss);
				if (role) {
					console.log(`Deleting role: ${boss}.`);
					message.guild.roles.delete(role).then(() => {
						pokenavChannel.send(`<@428187007965986826> delete notify-rule ${boss}`).then((msg) => {
							msg.delete();
							if (tier[1].indexOf(boss) == tier[1].length - 1 && input.lastKey() == tier[0]) {
								resolve();
							}
						});
					});
				} else {
					console.log(`Role: ${boss} didn't exist.`);
					pokenavChannel.send(`<@428187007965986826> delete notify-rule ${boss}`).then((msg) => {
						msg.delete();
						if (tier[1].indexOf(boss) == tier[1].length - 1 && input.lastKey() == tier[0]) {
							resolve();
						}
					});
				}
			}
		}
  });
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
