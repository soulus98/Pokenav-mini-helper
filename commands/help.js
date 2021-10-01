const { replyNoMention } = require("../func/misc.js");

module.exports = {
	name: "help",
	description: "Displays all commands and information for specific commands.",
  aliases: ["command", "commands"],
  usage: `\`${ops.prefix}help [command name]\``,
	permissions: "MANAGE_GUILD",
	execute(message, args) {
		return new Promise(function(resolve) {
			const data = [];
			const { commands } = message.client;
			if (!args.length) {
				data.push("Here's a list of all my commands:");
				data.push(commands.map(command => "`" + ops.prefix + command.name).join("`\n"));
				data.push(`\`You can use \`${ops.prefix}help [command name]\` for information on a specific command.`);
				replyNoMention(message, data.join("\n"));
				resolve(", and it was successful.");
				return;
			}
			const name = args[0].toLowerCase();
			const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
			if (!command) {
				message.reply(`\`${ops.prefix}${name}\` is not a valid command.`);
				resolve(`, but it failed, as ${ops.prefix}${name} not a valid command.`);
				return;
			}
			try {
				dataPush(data, command);
				replyNoMention(message, data.join("\n"), { split: true });
				resolve(", and it was successful.");
				return;
			} catch (err){
				resolve(`, but it failed, due to an unexpected error. Error: ${err}
Stack: ${err.stack}`);
				return;
			}
		});
	},
};
function dataPush(data, command){
	data.push(`\n**Name:** ${command.name}`);
	if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(", ")}`);
	if (command.description) data.push(`**Description:** ${command.description}`);
	if (command.usage) data.push(`**Usage:** ${command.usage}`);
	if (command.cooldown) data.push(`**Cooldown:** ${command.cooldown} second(s)`);
	return data;
}
