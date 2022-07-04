const { notify } = require("../func/notify.js");

module.exports = {
	name: "notify",
	description: "PokeNav Notification roles setup",
  aliases: ["noti"],
  usage: `\`${ops.prefix} <boss(1)> [boss2] ...\``, // testo
	guildOnly:true,
	args:true,
	execute(message, args) {
		return new Promise((resolve) => {
			if (hasDuplicates(args)) {
				resolve(", but it failed, as duplicate entries were entered.");
				return message.reply("Error: You cannot specify duplicate bosses.");
			}
			notify(message, args).then().catch(([err, messageData]) => {
				if (err == "none") {
					resolve(", but it failed, as all specified entries failed.");
					return message.reply(`Errors:\n• ${messageData.join("\n• ")}\n\nAll bosses entered had errors.\nNothing has been processed.`);
				} else if (err == "already") {
					resolve(", but it failed, as all specified entries were already in the notifyList.");
					return message.reply("Error: All of those bosses were found in the saved list.\nNothing has been processed.");
				} else {
					console.error(err);
				}
			});
		});
	},
};

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}
