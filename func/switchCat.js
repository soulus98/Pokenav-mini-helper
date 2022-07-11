const fs = require("fs"),
			path = require("path"),
			{ errorMessage } = require("../func/misc.js"),
			Discord = require("discord.js");
let list = new Discord.Collection();

module.exports = {
  async checkCategory(channel){
		console.log("oldCategoryId", oldCategoryId);
		const oldCategoryId = channel.parentId;
    const raidAnnounceChannelArr = list.map((group, key) => {
			if (group.includes(oldCategoryId)) return key;
		});
		if (!raidAnnounceChannelArr.length) return;
		const pokenavChannel = await channel.guild.channels.fetch(ops.pokenavChannel);
		const oldCategory = await channel.guild.channels.fetch(oldCategoryId);
		console.log("oldCategory.id", oldCategory.id);
		if (oldCategory.children.size >= ops.catLimit) {
			for (const raidAnnounceChannelId of raidAnnounceChannelArr) {
				console.log("raidAnnounceChannelId", raidAnnounceChannelId);
				const group = list.get(raidAnnounceChannelId);
				console.log("group", group);
				for (const c of group) {
					const cat = await channel.guild.channels.fetch(c);
					if (cat.children.size < ops.catLimit / 2) {
						console.log(`Swapping raid announce channel ${raidAnnounceChannelId} from ${oldCategory.name} to ${cat.name}`);
						pokenavChannel.send(`<@428187007965986826> set raid-lobby-category ${raidAnnounceChannelId} ${cat.id}`);
					}
				}
			}
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
  removeRaidCat(id) {
    return new Promise((resolve, reject) => {
			const removed = [];
      for (const item of list) {
				const group = item[1];
				if (group.includes(id)) {
					removed.push(item[0]);
					group.splice(group.indexOf(id));
          list.set(item[0], group);
        }
			}
			if (removed.length == 0) return reject();
      module.exports.saveRaidCatList().then(() => {
        resolve(removed);
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
