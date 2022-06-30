module.exports = {
	name: "reaction-roles-helper",
	description: "Pokenav helper command for a single-command workflow",
  aliases: ["rrh"],
  usage: `\`${ops.prefix}\`rrh <tier> <boss(1)> <emoji(1)>
[boss2] [emoji2]
...`, // testo
	guildOnly:true,
	args:true,
	execute(message) {
		return new Promise((resolve) => {
			// splitContent(message.content).then(([tier, data]) => {
			splitContent(testoContent).then(([tier, data]) => {
					for (let i = 0; i < data.length; i = i + 2) {
						console.log(data[i], data[i+1]);
					}
			}).catch(([err, row]) => {
				if (err == "short") {
					message.reply("");
					resolve(`, but it failed, as there were less than 2 arguments in row #${row}`);
				} else if (err == "long") {
					resolve(`, but it failed, as there were more than 2 arguments in row #${row}`);
				}
			});
		});
	},
};

const testoContent = `]rr tier5 articuno :articuno:
zapdos :zapdos:
moltres :moltres:`;

async function splitContent(input) {
	const data = [];
	const first = input.split("\n");
	let tier;
	for (const item of first) {
		const second = item.split(" ");
		if (first.indexOf(item) == 0) {
			second.splice(0, 1);
			tier = second.splice(0, 1)[0];
		}
		if (second.length < 2) throw ["short", first.indexOf(item) + 1];
		if (second.length > 2) throw ["long", first.indexOf(item) + 1];
		for (const secondItem of second){
			data.push(secondItem);
			if (first.indexOf(item) == first.length - 1 && second.indexOf(secondItem) == 1) {
				return [tier, data];
			}
		}
	}
}
