const { addRaidCat } = require("../func/switchCat.js"),
			{ dateToTime } = require("../func/misc.js");

module.exports = {
	name: "add-raid-category",
	description: "Links a raid category to a raid announce channel in the system that switches raid categories. Run in the intended channel or include a [channel id/tag] if you run it from an admin channel.",
  aliases: ["ac", "arc", "add-category"],
  usage: `\`${ops.prefix}add <raidCategory> [announceChannel id/tag]\``,
	guildOnly:true,
	args: true,
	type:"Raid Category",
	async execute(message, args) {
		message.react("👀");
		return new Promise((resolve) => {
			let announceChannelId = 0;
			if (args[1]) {
				announceChannelId = args[1];
				if (args[1].startsWith("<#") && args[1].endsWith(">")) {
					announceChannelId = args[1].slice(2, -1);
				}
			} else {
				announceChannelId = message.channel.id;
			}
			message.guild.channels.fetch(announceChannelId).then((channel) => {
				let raidCatId = args[0];
				if (args[0].startsWith("<#") && args[0].endsWith(">")) {
					raidCatId = args[0].slice(2, -1);
				}
				message.guild.channels.fetch(raidCatId).then((category) => {
					addRaidCat(raidCatId, announceChannelId).then(() => {
						setTimeout(() => {
							message.delete().catch(() => { // eslint-disable-line max-nested-callbacks
								console.error(`[${dateToTime(new Date())}]: Error: Could not delete message: ${message.url}\nContent of mesage: "${message.content}"`);
								message.react("👍");
							});
						}, 1000);
						resolve(`, and linked ${category.name}${category} to the ${channel.name}${channel} raid announce watcher.`);
						return;
					}).catch(() => {
						message.reply(`${category} is already linked to ${channel}.`);
						resolve(`, but it failed, since ${category} is already linked to ${channel}.`);
						return;
					});
				}).catch(() => {
					message.reply("There may be a typo, or some other issue, which causes me to not be able to find this category.");
					resolve(`, but it failed, since I couldn't find a category with ID: #${raidCatId}.`);
					return;
				});
			}).catch(() => {
				message.reply("There may be a typo, or some other issue, which causes me to not be able to find this channel.");
				resolve(`, but it failed, since I couldn't find a channel with ID: #${announceChannelId}.`);
				return;
			});
		});
	},
};
