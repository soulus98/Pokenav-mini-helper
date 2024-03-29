const { replyNoMention } = require("../func/misc.js");

module.exports = {
	name: "restart",
	description: "Restarts the bot. I haven't (can't) thoroughly tested this, so sorry if t doesn't work",
  aliases: ["rs"],
  usage: "`[prefix]rs`",
	guildOnly:true,
	type:"Admin",
	execute(message) {
		return new Promise(function(resolve) {
			console.log(`${message.author.username}${message.author} force quit the server at ${message.createdAt.toLocaleString()}.`);
			replyNoMention(message, "Restarting...").then(() => {
				resolve();
				setTimeout(() => {
					process.exit(1);
				}, 10);
			});
		});
	},
};
