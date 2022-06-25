const fs = require("fs"),
			path = require("path"),
			{ errorMessage } = require("../func/misc.js"),
			Discord = require("discord.js"),
			catLimit = 3;
let list = new Discord.Collection();

module.exports = {
  checkCategory(channel){
		const pokenavChannel = channel.guild.channels.fetch(ops.pokenavChannel);
		const oldCategory = channel.parentId;
    const raidAnnounceChannel = list.reduce((acc, group, k) => {
			if (group.includes(oldCategory)) acc = k;
			return acc;
		}, false);
		if (oldCategory.parent.children.cache.size == catLimit) {
			const group = list.get(raidAnnounceChannel);
			group.forEach((c) => {
				channel.guild.channels.fetch(c).then((cat) => {
					if (cat.children.cache.size < catLimit / 2) {
						return pokenavChannel.send(`<@428187007965986826> set raid-lobby-category <#${raidAnnounceChannel}> ${cat}`);
					}
				});
			});
		}
  },
  addRaidCat(cat, ch) {
    return new Promise((resolve, reject) => {
      if (!list.get(ch)) {
        list.set(ch, []);
      }
      const group = list.get(ch);
      if (group.includes(cat)) return reject();
      group.push(cat);
      list.set(ch, group);
      module.exports.saveRaidCatList().then(() => {
        resolve();
      });
    });
  },
  removeRaidCat(id, g) {
    return new Promise((resolve, reject) => {
      if (g == "all") {
        const removed = [];
        for (const gr of list) {
          if (gr[1].includes(id)) {
            gr[1].splice(gr[1].indexOf(id));
            removed.push(true);
          } else {
            removed.push(false);
          }
        }
        if (removed.includes(true)) {
          module.exports.saveRaidCatList().then(() => {
            resolve();
          });
        } else {
          reject();
        }
        return;
      }
      const group = list.get(g);
      if (!group.includes(id)) return reject();
      group.splice(group.indexOf(id));
      list.set(g, group);
      module.exports.saveRaidCatList().then(() => {
        resolve();
      });
    });
  },
  loadRaidCatList() {
    return new Promise(function(resolve, reject) {
      new Promise((res) => {
        try {
          delete require.cache[require.resolve("../server/raidCatList.json")];
          res();
        } catch (e){
          if (e.code == "MODULE_NOT_FOUND") {
            // do nothing
            res();
          } else {
            reject(`Error thrown when loading raidCat list. Error: ${e}`);
            return;
          }
        }
      }).then(() => {
        try {
          const jsonList = require("../server/raidCatList.json");
          for (const g in jsonList) {
            list.set(g, jsonList[g]);
          }
          const catAmount = list.reduce((acc, item) => {
            acc = acc + item.length;
            return acc;
          }, 0);
          console.log(`\nRaid Category list loaded. It contains ${catAmount} categories linked to ${list.size} channels.`);
          resolve(list);
        } catch (e) {
          if (e.code == "MODULE_NOT_FOUND") {
            fs.writeFile(path.resolve(__dirname, "../server/raidCatList.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
              if (err){
                reject(`Error thrown when writing the raidCat list file. Error: ${err}`);
                return;
              }
              console.log("Could not find raidCatList.json. Making a new one...");
              list = require("../server/raidCatList.json");
              resolve(list);
            });
          }	else {
            reject(`Error thrown when loading the raidCat list (2). Error: ${e}`);
            return;
          }
        }
      });
    });
  },
  saveRaidCatList() {
    return new Promise((resolve) => {
      fs.writeFile(path.resolve(__dirname, "../server/raidCatList.json"), JSON.stringify(Object.fromEntries(list)), (err) => {
        if (err){
          errorMessage(new Date(), false, `Error: An error occured while saving the raidCat list. Error: ${err}`);
          return;
        } else {
          resolve();
          return;
        }
      });
    });
  },
};
