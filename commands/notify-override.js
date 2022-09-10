const { override } = require("../func/notify.js");

module.exports = {
	name: "notify-override",
	description: "PokeNav Notification roles setup. All arguments after `tier` must be of the same type. Either `boss` or `emoji`",
  aliases: ["override", "n-override", "or", "over"],
  usage: "`[prefix]override <tier> <boss1/emoji1> [boss2/emoji2] [...]`", // testo
	guildOnly:true,
	args:true,
	async execute(message, args) {
		const ops = message.client.configs.get(message.guild.id);
		if (message.channelId != ops.pokenavChannel) return ", but it wasn't sent in pokenavChannel";
		if (!ops.notifyReactionChannel) return ", but notifyReactionChannel is blank";
    if (args.length < 2) {
      message.reply(`You must supply at least 2 arguments in the form \`${module.exports.usage.replace("[prefix]", ops.prefix)}\``);
      return ", but args was less than 2 long";
    }
    const tierInput = args.shift().toLowerCase();
    let tier;
    if (["1", "t1", "tier1", "t 1", "tier 1", "tier 1 boss", "tier1boss", "tier 1 raid boss"].includes(tierInput)) tier = "1";
    else if (["2", "t2", "tier2", "t 2", "tier 2", "tier 2 boss", "tier2boss", "tier 2 raid boss"].includes(tierInput)) tier = "2";
    else if (["3", "t3", "tier3", "t 3", "tier 3", "tier 3 boss", "tier3boss", "tier 3 raid boss"].includes(tierInput)) tier = "3";
    else if (["4", "t4", "tier4", "t 4", "tier 4", "tier 4 boss", "tier4boss", "tier 4 raid boss"].includes(tierInput)) tier = "4";
    else if (["5", "t5", "tier5", "t 5", "tier 5", "tier 5 boss", "tier5boss", "tier 5 raid boss"].includes(tierInput)) tier = "5";
    else if (["mega 5", "mega5", "5 mega", "5mega", "tmega5", "m5", "5m", "mega legendary", "legendary mega"].includes(tierInput)) tier = "5";
    else if (["mega", "tmega", "tiermega", "m", "tm", "tierm", "t mega", "tier mega", "t m", "tier m"].includes(tierInput)) tier = "5";
    else if (["ultra beast", "ultra", "ub", "tub", "tultra", "t ub", "t ultra", "t ultra beast", "tierub", "tierultra", "tier ub", "tier ultra", "tier ultra beast"].includes(tierInput)) tier = "5";
    else {
      message.reply(`I could not discern the tier from ${tierInput}.\nPlease provide one of the following tiers: \`1\`, \`2\`, \`3\`, \`4\`, \`5\`, \`mega\`, \`mega 5\`, \`ultra beast\``);
      return `, but I could not discern a tier from ${tierInput}`;
    }
		let type = "boss";
		if (args[0].startsWith("<:")) type = "emoji";
    try {
      const res = await override(message, tier, args, type);
      return res;
    } catch (e) {
			if (!e[0]) {
				message.reply("Unknown error. Tell soul.");
				console.error("Unknown error. Tell soul:");
				console.error(e);
				return;
			}
			const [err, messageData] = e;
      if (err == "already") {
        message.reply("Error: This boss was found in the saved list.\nNothing has been processed.");
        return ", but it failed, as the specified boss was already in the notifyList.";
      } else if (err == "dupe") {
				message.reply(`Error: Duplicate bosses were found${(messageData) ? ` in ${messageData}` : ""}.\nYou cannot specify duplicate bosses.`);
				return ", but it failed, as duplicate entries were entered.";
			} else {
				message.reply(err);
				return `, but it failed, because of an unexpected error:${err}`;
      }
    }
	},
};
/* Tier 1 Raid Boss
Tier 2 Raid Boss
Tier 3 Raid Boss
Tier 4 Raid Boss
Tier 5 Raid Boss
Tier Mega 5 Raid Boss
Tier Mega Raid Boss
Tier Ultra Beast Raid Boss
*/
