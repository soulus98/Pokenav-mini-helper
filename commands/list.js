const { loadFilterList } = require("../func/filter.js");
module.exports = {
	name: "list-filter-channels",
	description: "",
  aliases: ["ls", "list", "list-channels", "list-filter", "filter-channels"],
  usage: `\`${ops.prefix}\``,
	guildOnly:true,
	async execute(message) {
    loadFilterList().then((list) => {
      if (list.length == 0) {
        message.reply("There are no channels currently being filtered");
        return;
      }
      const data = ["Here is a list of the currently filtered channels:"];
      for (const channel of list) {
        data.push(`<#${channel}>`);
      }
      message.reply(data.join("\n"));
      return;
    });
	},
};
