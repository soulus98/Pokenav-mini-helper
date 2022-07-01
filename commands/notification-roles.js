const Discord = require('discord.js');

module.exports = {
	name: "notify",
	description: "PokeNav Notification roles setup",
  aliases: ["noti"],
  usage: `\`${ops.prefix}\``, // testo
	guildOnly:true,
	args:true,
	execute(message, args) {
		return new Promise((resolve) => {
			pokeNavCheck(args, message).then(async (result) => {
				console.log(result);
					// make role
					// $create notify-rule Cresselia boss:Cresselia
					// set some shit for reaction based on tier... lol
			}).catch((err) => {
				if (err == "dupe") {
					resolve(", but it failed, as duplicate entries were entered.");
					return message.reply("You cannot specify duplicate bosses");
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
				pokenavChannel.send(`<@428187007965986826> counters ${mon}`).then(() => {
					setTimeout(() => {
						const resp = pokenavChannel.lastMessage;
						const respTitle = resp.embeds[0].title;
						setTimeout(() => {
							pokenavChannel.bulkDelete(2).catch(() => console.error("Could not delete a message in the pokenavChannel"));
						}, 500);
						if (respTitle == "Error") return message.reply(`PokeNav could not find ${mon}. Please try again for that boss.`);
						const tierLocation = respTitle.toLowerCase().indexOf("tier");
						const tier = respTitle.slice(tierLocation, respTitle.length - 1);
						let group = result.get(tier);
						if (!group) group = [];
						group.push(mon);
						result.set(tier, group)
						if (data.indexOf(mon) == data.length - 1) resolve(result);
					}, 1000);
				});
			}, 3000 * (data.indexOf(mon) + 1));
		}
	});
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}
