const { removeRaidCat } = require("../func/switchCat.js"),
			{ dateToTime } = require("../func/misc.js");

module.exports = {
	name: "remove-raid-category",
	description: "Unlinks all raid categories from a certain raid announce channel in the system that switches categories with PokeNav.",
  aliases: ["rc", "rrc", "remove-category"],
  usage: "`[prefix]rrc [channel id]`",
	guildOnly:true,
	type:"Raid Category",
	execute(message, args) {
		message.react("👀");
		return new Promise(function(resolve) {
			let id = 0;
			if (args[0]) {
				id = args[0];
				if (args[0].startsWith("<#") && args[0].endsWith(">")) {
					id = args[0].slice(2, -1);
				}
			} else {
				id = message.channel.id;
			}
			console.log(id);
			message.guild.channels.fetch(id).then((channel) => {
				removeRaidCat(id, message.guild.id).then(() => {
					setTimeout(() => {
						message.delete().catch(() => {
							message.react("👍").catch();
							console.error(`[${dateToTime(new Date())}]: Error: Could not delete message: ${message.url}\nContent of mesage: "${message.content}"`);
						});
					}, 1000);
					resolve(`, and removed ${channel.name}#${id} from the list.`);
				}).catch(() => {
					message.reply("That channel was not found in the watch list.");
					resolve(`, but it failed, since ${channel.name}#${id} was not found in the raidCat watch list.`);
				});
			}).catch(() => {
				message.reply("There may be a typo, or some other issue, which causes me to not be able to find this channel.");
				resolve(`, but it failed, since I couldn't find a channel with ID: #${id}.`);
				return;
			});
		});
	},
};
