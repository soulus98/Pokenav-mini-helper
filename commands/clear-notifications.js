const { clearNotify } = require("../func/notify.js");

module.exports = {
	name: "clear-notify",
	description: "Clears bosses from the reaction system and deletes the roles.",
  aliases: ["cnotify", "cn"],
  usage: "`[prefix]clear-notify <boss(1)> [boss2] ...` or `[prefix]clear-notify all`", // testo
	guildOnly:true,
	args:true,
	execute(message, args){
		return new Promise((resolve) => {
			const ops = message.client.configs.get(message.guild.id);
			if (message.channelId != ops.pokenavChannel) return resolve(", but it wasn't sent in pokenavChannel");
			if (!ops.notifyReactionChannel) return resolve(", but notifyReactionChannel is blank");
			clearNotify(message, args).catch((e) => {
				if (e.length == 2){
					const [err, messageData] = e;
					if (err == "dupe") {
						resolve(", but it failed, as duplicate entries were entered.");
						return message.reply(`Error: Duplicate bosses were found${(messageData) ? ` in ${messageData}` : ""}.\nYou cannot specify duplicate bosses.`);
					} else console.error(err);
				} else {
					console.error(e);
					message.reply(e);
				}
			});
		});
	},
};
