/* eslint max-nested-callbacks: 0 */
const Discord = require("discord.js"),
			fs = require("fs"),
			path = require("path"),
			{ errorMessage, dateToTime } = require("../func/misc.js");
let list = new Discord.Collection();


module.exports = {
	notify(message, args) {
		return new Promise((resolve, reject) => {
			console.log(`[${dateToTime(new Date())}]Beginning notification workflow for: ${args.join(", ")}`);
			argsCheck(args).then((checkedArgs) => {
				if (!checkedArgs.length) return reject(["already"]);
				const messageData = [];
				const removedArgs = args.filter((v) => !checkedArgs.includes(v));
				if (removedArgs.length) messageData.push(`The following bosses were found in the saved list. They won't be added: \`${removedArgs.join("`, `")}\``);
				pokeNavCheck(checkedArgs, message).then(async ([result, m]) => {
					m.forEach((item) => messageData.push(item));
					if (typeof result == "string") return reject([result, messageData]);
					roleMake(result, message).then(async () => {
						const notifyChannel = await message.guild.channels.fetch(ops.notifyReactionChannel);
						console.log("Updating saved list");
						list.forEach((arr, key) => {
							if (result.has(key)) {
								const resultArr = result.get(key);
								const newArr = arr.concat(resultArr);
								list.set(key, newArr);
							}
						});
						result.forEach((arr, key) => {
							if (!list.has(key)) {
								list.set(key, arr);
							}
						}); // exists roles zapdos
						module.exports.saveNotifyList();
						// const row = new Discord.MessageActionRow()
						// .addComponents([
						// 	new Discord.MessageSelectMenu()
						// 	.setCustomId()
						// ])
						// notifyChannel.send();


						// message.reply(messageData.join("\n"));
						// resolve();
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
				return m.author.id == 428187007965986826 && (m.embeds[0]?.title.toLowerCase().includes(mon) || m.embeds[0]?.title.toLowerCase().includes("error"));
			};
			pokenavChannel.awaitMessages({ filter, max: 1, time: 20000, errors: ["time"] }).then((resp) => {
				try {
					const respTitle = resp.first().embeds[0].title;
					pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
					if (respTitle == "Error") {
						messageData.push(`PokeNav could not find \`${mon}\`. Please try again for that boss.`);
					} else {
						const tierLocation = respTitle.toLowerCase().indexOf("tier");
						const tier = respTitle.slice(tierLocation, respTitle.length - 1);
						let group = result.get(tier);
						if (!group) group = [];
						group.push(mon);
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
				messageData.push(`PokeNav did not respond quickly enough for \`${mon}\`. Please try again for that boss.`);
				if (data.indexOf(mon) == data.length - 1) {
					if (result.size > 0) {
						resolve([result, messageData]);
					} else {
						resolve(["none", messageData]);
					}
				}
				return;
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
				const role = message.guild.roles.cache.find(r => r.name.toLowerCase() == boss.toLowerCase());
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
