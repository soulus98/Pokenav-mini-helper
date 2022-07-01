const Discord = require('discord.js');

module.exports = {
	name: "notify",
	description: "PokeNav Notification roles setup",
  aliases: ["noti"],
  usage: `\`${ops.prefix} <boss(1)> [boss2] ...\``, // testo
	guildOnly:true,
	args:true,
	execute(message, args) {
		return new Promise((resolve) => {
			pokeNavCheck(args, message).then(async (result) => {
			  for (const boss of result){
			    let role = message.guild.roles.cache.find(r => r.name.toLowerCase() == boss.toLowerCase());
			    if (!role) {
			      role = await message.guild.roles.create({ name: mon });
			      console.log(role.name);
			    }
			  }
        // check role
				// make role
				// $create notify-rule Cresselia boss:Cresselia
				// set some shit for reaction based on tier... lol
			}).catch((err) => {
				if (err == "dupe") {
					resolve(", but it failed, as duplicate entries were entered.");
					return message.reply("You cannot specify duplicate bosses");
				} else if (err == "none") {
					resolve(", but it failed, all specified entries failed.");
					return message.reply("All bosses entered had errors. Nothing has been processed.");
				} else {
					console.error(err);
				}
			});
		});
	},
};

async function pokeNavCheck(data, message) {
	const pokenavChannel = await message.guild.channels.fetch(ops.pokenavChannel);
	return new Promise(function(resolve, reject) {
		const result = new Discord.Collection;
		if (hasDuplicates(data)) return reject("dupe");
		message.react("👀");
		for (const mon of data) {
			setTimeout(() => {
				pokenavChannel.send(`<@428187007965986826> counters ${mon}`).then((msg) => {
					const filter = m => {
						return m.author.id == 428187007965986826 && (m.embeds[0]?.title.toLowerCase().includes(mon) || m.embeds[0]?.title.toLowerCase().includes("error"))
					};
					pokenavChannel.awaitMessages({ filter, max: 1, time: 1000, errors: ["time"] }).then((resp) => {
						try {
							const respTitle = resp.first().embeds[0].title;
							pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
							if (respTitle == "Error") {
								message.reply(`PokeNav could not find \`${mon}\`. Please try again for that boss.`);
							} else {
								const tierLocation = respTitle.toLowerCase().indexOf("tier");
								const tier = respTitle.slice(tierLocation, respTitle.length - 1);
								let group = result.get(tier);
								if (!group) group = [];
								group.push(mon);
								result.set(tier, group);
							}
							if (data.indexOf(mon) == data.length - 1) {
								if (result.size > 0) {
									resolve(result);
								} else {
									reject("none");
								}
							}
						} catch (e) {
							return console.error("An unexpected error in ]notify. error:", e);
						}
					}).catch(() => {
						message.reply(`PokeNav did not respond quickly enough for \`${mon}\`. Please try again for that boss.`);
						console.log(data.indexOf(mon) == data.length - 1);
						console.log(data.indexOf(mon), data.length - 1);
						console.log(result.size);
						if (data.indexOf(mon) == data.length - 1) {
							if (result.size > 0) {
								resolve(result);
							} else {
								reject("none");
							}
						}
						return;
					});
				});
			}, 2000 * (data.indexOf(mon) + 1));
		}
	});
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}
