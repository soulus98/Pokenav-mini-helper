const { updateAPI, searchAPI } = require("../func/notify.js");

module.exports = {
	name: "api",
	description: "Performs a function using the Pokevattler API stored for looking up tier and dex info.\nUse `update` to update the local copy of the API if it is out of date.\nUse `search <>`",
  aliases: [],
  usage: "`[prefix]api <option> [value]`",
	guildOnly:true,
	permissions: "MANAGE_GUILD",
	type:"Notifications",
	args:true,
	async execute(message, args) {
		if (args[0] == "update") {
			await updateAPI();
			message.reply("successful");
			return ", and it succeeded";
		} else if (args[0] == "search") {
      if (!args[1]) {
				message.reply("You must supply a value to search for");
        return ", but it failed, as there was no value to search for";
			}
			const result = await searchAPI(args[1]);
		  message.reply(`I found the following options containing ${args[1]}: \n• ${result.join("\n• ")}`);
			return ", and it succeeded";
		}
	},
};
