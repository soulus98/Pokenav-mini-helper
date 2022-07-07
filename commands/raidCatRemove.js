const { removeRaidCat } = require("../func/switchCat.js"),
			{ dateToTime } = require("../func/misc.js");

module.exports = {
	name: "remove-raid-category",
	description: "Unlinks a raid category from all channels in the system that switches categories with PokeNav.",
  aliases: ["rc", "rrc", "remove-category"],
  usage: `\`${ops.prefix}rrc <category id>\``,
	guildOnly:true,
	args:true,
	type:"Raid Category",
	execute(message, args) {
		message.react("👀");
		return new Promise(function(resolve) {
			let id = args[0];
			if (args[0].startsWith("<#") && args[1].endsWith(">")) {
				id = args[0].slice(2, -1);
			}
			message.guild.channels.fetch(id).then((cat) => {
				removeRaidCat(id).then((removed) => {
					setTimeout(() => {
						message.delete().catch(() => {
							console.error(`[${dateToTime(new Date())}]: Error: Could not delete message: ${message.url}\nContent of mesage: "${message.content}"`);
						});
					}, 1000);
					resolve(`, and removed ${cat.name}#${id} from ${removed.join(", ")}.`);
				}).catch(() => {
					message.reply("That category was not found in the watch list.");
					resolve(`, but it failed, since ${cat.name}#${id} was not found in the raidCat watch list.`);
				});
			}).catch(() => {
				message.reply("There may be a typo, or some other issue, which causes me to not be able to find this category.");
				resolve(`, but it failed, since I couldn't find a channel with ID: #${id}.`);
				return;
			});
		});
	},
};
