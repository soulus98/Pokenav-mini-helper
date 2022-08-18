const { clearNotify } = require("../func/notify.js");

module.exports = {
	name: "clear-notify",
	description: "Clears bosses from the reaction system and deletes the roles.",
  aliases: ["cnotify", "cn"],
  usage: "`[prefix]clear-notify <boss(1)> [boss2] ...` or `[prefix]clear-notify all`", // testo
	guildOnly:true,
	args:true,
	type:"Notifications",
	execute(message, args){
		return new Promise((resolve) => {
			const ops = message.client.configs.get(message.guild.id);
			if (message.channelId != ops.pokenavChannel) return resolve(", but it wasn't sent in pokenavChannel");
			if (!ops.notifyReactionChannel) return resolve(", but notifyReactionChannel is blank");
			clearNotify(message, args).catch((e) => {
				if (!e[0]) {
					message.reply(e);
					console.error(e);
				}
				const [err, messageData] = e;
				if (err == "none") {
					resolve(", but it failed, as all specified entries failed.");
					return message.reply(`Errors:\n• ${messageData.join("\n• ")}\n\nAll bosses entered had errors.\nNothing has been processed.`);
				} else if (err == "not found") {
					resolve(", but it failed, as none of the specified entries were found in the notifyList.");
					return message.reply("Error: None of those bosses were found in the saved list.\nNothing has been processed.");
				} else if (err == "dupe") {
					resolve(", but it failed, as duplicate entries were entered.");
					return message.reply(`Error: Duplicate bosses were found${(messageData) ? ` in ${messageData}` : ""}.\nYou cannot specify duplicate bosses.`);
				} else {
					message.reply(e);
					console.error(e);
				}
			});
		});
	},
};
