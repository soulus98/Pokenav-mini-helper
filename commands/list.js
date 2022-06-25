const { loadCleanupList } = require("../func/filter.js"),
			{ loadRaidCatList } = require("../func/switchCat.js");

module.exports = {
	name: "list-filter-channels",
	description: "",
  aliases: ["ls", "list", "list-channels", "list-filter", "filter-channels"],
  usage: `\`${ops.prefix}\``,
	guildOnly:true,
	args:true,
	type:"Info",
	async execute(message, args) {
		if (args[0].toLowerCase() == "cleanup") {
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
		} else if (args[0].toLowerCase() == "raidcat") {
			loadRaidCatList().then((list) => {
				if (list.length == 0) {
					message.reply("There are raid categories currently being watched");
					return;
				}
				const data = ["Here is a list of the currently watched raid categories:"];
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
		} else {
			message.reply(`Please use \`${ops.prefix}list <option>\` with either \`cleanup\` or \`raidCat\``);
		}
	},
};
