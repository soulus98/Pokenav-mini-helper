const { override } = require("../func/notify.js");

module.exports = {
	name: "notify-override",
	description: "PokeNav Notification roles setup",
  aliases: ["override", "n-override", "or"],
  usage: "`[prefix]override <boss> <tier> [emoji]`", // testo
	guildOnly:true,
	args:true,
	async execute(message, args) {
		const ops = message.client.configs.get(message.guild.id);
		if (message.channelId != ops.pokenavChannel) return ", but it wasn't sent in pokenavChannel";
		if (!ops.notifyReactionChannel) return ", but notifyReactionChannel is blank";
    if (args.length > 3 || args.length < 2) {
      message.reply(`You must supply 2 or 3 arguments in the form \`${ops.prefix}override <boss> <tier> [emoji]\``);
      return ", but notifyReactionChannel is blank";
    }
    const tierInput = args[1].toLowerCase();
    let tier;
    if (["1", "t1", "tier1", "t 1", "tier 1", "tier 1 boss", "tier1boss", "tier 1 raid boss"].includes(tierInput)) tier = "1";
    else if (["2", "t2", "tier2", "t 2", "tier 2", "tier 2 boss", "tier2boss", "tier 2 raid boss"].includes(tierInput)) tier = "2";
    else if (["3", "t3", "tier3", "t 3", "tier 3", "tier 3 boss", "tier3boss", "tier 3 raid boss"].includes(tierInput)) tier = "3";
    else if (["4", "t4", "tier4", "t 4", "tier 4", "tier 4 boss", "tier4boss", "tier 4 raid boss"].includes(tierInput)) tier = "4";
    else if (["5", "t5", "tier5", "t 5", "tier 5", "tier 5 boss", "tier5boss", "tier 5 raid boss"].includes(tierInput)) tier = "5";
    else if (["mega 5", "mega5", "5 mega", "5mega", "tmega5", "m5", "5m", "mega legendary", "legendary mega"].includes(tierInput)) tier = "5"; //mega 5
    else if (["mega", "tmega", "tiermega", "m", "tm", "tierm", "t mega", "tier mega", "t m", "tier m"].includes(tierInput)) tier = "5"; // mega
    else if (["ultra beast", "ultra", "ub", "tub", "tultra", "t ub", "t ultra", "t ultra beast", "tierub", "tierultra", "tier ub", "tier ultra", "tier ultra beast"].includes(tierInput)) tier = "5"; // ultra beast
    else {
      message.reply(`I could not discern the tier from ${tierInput}.\nPlease provide one of the following tiers: \`1\`, \`2\`, \`3\`, \`4\`, \`5\`, \`mega\`, \`mega 5\`, \`ultra beast\``);
      return `, but I could not discern a tier from ${tierInput}`;
    }
    try {
      const res = await override(message, args[0], tier, args[2]);
      return res;
    } catch (err) {
      if (err == "already") {
        message.reply("Error: This boss was found in the saved list.\nNothing has been processed.");
        return ", but it failed, as the specified boss was already in the notifyList.";
      } else {
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
