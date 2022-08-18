const { updateAPI } = require("../func/notify.js");

module.exports = {
	name: "update-api",
	description: "Updates the local version of the Pokebattler API stored for looking up tier and dex info.",
  aliases: ["api"],
  usage: "`[prefix]api`",
	guildOnly:true,
	permissions: "MANAGE_GUILD",
	type:"Notifications",
	async execute(message, args) {
		await updateAPI();
		message.reply("successful");
		return ", and it succeeded";
	},
};
