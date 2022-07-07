const { notify } = require("../func/notify.js");

module.exports = {
	name: "notify",
	description: "PokeNav Notification roles setup",
  aliases: ["noti", "n"],
  usage: `\`${ops.prefix}notify <boss(1)> [boss2] ...\``, // testo
	guildOnly:true,
	args:true,
	execute(message, args) {
		return new Promise((resolve) => {
			if (!ops.notifyReactionChannel) return resolve(", but notifyReactionChannel is blank");
			if (!ops.pokenavChannel) {
				message.reply("Please set pokenavChannel in the config");
				resolve(", but pokenavChannel is blank");
				return;
			}
			notify(message, args).then().catch(([err, messageData]) => {
				if (err == "none") {
					resolve(", but it failed, as all specified entries failed.");
					return message.reply(`Errors:\n• ${messageData.join("\n• ")}\n\nAll bosses entered had errors.\nNothing has been processed.`);
				} else if (err == "already") {
					resolve(", but it failed, as all specified entries were already in the notifyList.");
					return message.reply("Error: All of those bosses were found in the saved list.\nNothing has been processed.");
				} else if (err == "dupe") {
					resolve(", but it failed, as duplicate entries were entered.");
					return message.reply(`Error: Duplicate bosses were found${(messageData) ? ` in ${messageData}` : ""}.\nYou cannot specify duplicate bosses.`);
				} else {
					console.error(err);
				}
			});
		});
	},
};
