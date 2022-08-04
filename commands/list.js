const { loadCleanupList } = require("../func/filter.js"),
			{ loadRaidCatList } = require("../func/switchCat.js"),
			{ loadNotifyList } = require("../func/notify.js");

module.exports = {
	name: "list-filter-channels",
	description: "Lists all of the filtered raid channels and raid categories. Type must be either `cleanup`, `categories`, or `notifications`",
  aliases: ["ls", "list", "list-channels", "list-filter", "filter-channels"],
  usage: "`[prefix]list <type>`",
	guildOnly:true,
	type:"Info",
	args:true,
	async execute(message, args) {
		if (args[1]) {
			message.reply("You must specify *only one* argument.");
			return `, but it failed, as ${args} is too many args`;
		}
		switch (args[0]) {
			case "clean":
			case "cleanup":
				loadCleanupList().then((list) => {
					const chAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					if (chAmount == 0) {
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
				return;
			case "categories":
			case "cats":
			case "catswitch":
				loadRaidCatList().then((list) => {
					const catAmount = list.reduce((acc, item) => {
						acc = acc + item.length;
						return acc;
					}, 0);
					if (catAmount == 0) {
						message.reply("There are no raid categories currently being watched");
						return;
					}
					const data = ["Here is a list of the currently watched raid categories and their linked announce channels:"];
					list.each((arr, group) => {
						data.push(`<#${group}>:`);
						if (arr.length == 0) data.push("No channels");
						else arr.forEach((channel) => {
							data.push(`<#${channel}>`);
						});
						data.push("");
					});
					message.reply(data.join("\n"));
					return;
				});
				return;
			case "notifications":
			case "notis":
				loadNotifyList().then((list) => {
					const bossAmount = list.reduce((acc, g) => {
						acc = acc + g.length;
						return acc;
					}, 0);
					if (bossAmount == 0) {
						message.reply("There are no boss notifications at the moment");
						return;
					}
					const data = ["Here is a list of the current notifications:"];
					list.each((arr, group) => {
						data.push(`\n\n**${group}:**\n`);
						if (arr.length == 0) data.push("No bosses");
						else arr.forEach((item) => {
							data.push(`<:${item.identifier}>`);
						});
					});
					message.reply(data.join(""));
					return;
				});
				return;
			default:
				message.reply("Type must be either `cleanup`, `categories`, or `notifications`");
				return ", but it failed, as type was not allowed";
		}
	},
};
