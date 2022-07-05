const { clearNotify } = require("../func/notify.js");

module.exports = {
	name: "clear-notify",
	description: "Clears bosses from the reaction system and deletes the roles.",
  aliases: ["cnotify", "cn"],
  usage: `\`${ops.prefix}clear-notify <boss(1)> [boss2] ...\` or \`${ops.prefix}clear-notify all\``, // testo
	guildOnly:true,
	args:true,
	execute(message, args){
		return new Promise((resolve) => {
			clearNotify(message, args).then().catch(([err, messageData]) => {
				/* if (err == "none") {
					resolve(", but it failed, as all specified entries failed.");
					return message.reply(`Errors:\n• ${messageData.join("\n• ")}\n\nAll bosses entered had errors.\nNothing has been processed.`);
				} else if (err == "already") {
					resolve(", but it failed, as all specified entries were already in the notifyList.");
					return message.reply("Error: All of those bosses were found in the saved list.\nNothing has been processed.");
				} else */if (err == "dupe") {
					resolve(", but it failed, as duplicate entries were entered.");
					return message.reply(`Error: Duplicate bosses were found${(messageData) ? ` in ${messageData}` : ""}.\nYou cannot specify duplicate bosses.`);
				} else {
					console.error(err);
				}
			});
		});
	},
};
