const { notify } = require("../func/notify.js");

module.exports = {
	name: "notify",
	description: "PokeNav Notification roles setup",
  aliases: ["noti", "n"],
  usage: "`[prefix]notify <boss(1)> [boss2] ...`", // testo
	guildOnly:true,
	args:true,
	type:"Notifications",
	execute(message, args) {
		return new Promise((resolve) => {
			const ops = message.client.configs.get(message.guild.id);
			if (message.channelId != ops.pokenavChannel) return resolve(", but it wasn't sent in pokenavChannel");
			if (!ops.notifyReactionChannel) return resolve(", but notifyReactionChannel is blank");
			notify(message, args).then().catch((e) => {
				if (!e[0]) {
					message.reply(e);
					console.error(e);
					return;
				}
				const [err, messageData] = e;
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
					message.reply(e);
					console.error(e);
				}
			});
		});
	},
};
