const { loadCleanupList } = require("../func/filter.js");
module.exports = {
	name: "list-filter-channels",
	description: "",
  aliases: ["ls", "list", "list-channels", "list-filter", "filter-channels"],
  usage: `\`${ops.prefix}\``,
	guildOnly:true,
	type:"Pokenav Cleanup",
	async execute(message) {
    loadCleanupList().then((list) => {
      if (list.length == 0) {
        message.reply("There are no channels currently being filtered");
        return;
      }
      const data = ["Here is a list of the currently filtered channels:"];
			list.each((arr, group) => {
				data.push(`**${group}:**`);
				if (arr.length == 0) data.push("No channels");
				else arr.forEach((channel) => {
					data.push(`<#${channel}>`);
				});
				data.push("");
			});
      message.reply(data.join("\n"));
      return;
    });
	},
};
