const fs = require("fs"),
			path = require("path"),
			{ errorMessage, dateToTime } = require("../func/misc.js"),
			Discord = require("discord.js");
const serverLists = new Discord.Collection(),
			lookup = new Discord.Collection();
let timedOut = false;

module.exports = {
  async checkCategory(channel){
		console.log(serverLists);
		console.log(channel.guild.id);
		const list = serverLists.get(channel.guild.id);
		const ops = channel.client.configs.get(channel.guild.id);
		const oldCategoryId = channel.parentId;
		if (oldCategoryId == timedOut) return;
		const filteredList = list.filter((group) => {
			if (group.includes(oldCategoryId)) return true;
		});
		if (!filteredList.size) return;
    const raidAnnounceChannelArr = filteredList.keys();
		const pokenavChannel = await channel.guild.channels.fetch(ops.pokenavChannel);
		const oldCategory = await channel.guild.channels.fetch(oldCategoryId);
		if (oldCategory.children.size >= ops.catLimit) {
			for (const raidAnnounceChannelId of raidAnnounceChannelArr) {
				const group = list.get(raidAnnounceChannelId);
				const pivot = group.indexOf(oldCategoryId) + 1;
				const sortedGroup = [...group.slice(pivot), ...group.slice(0, pivot)];
				for (const c of sortedGroup) {
					const cat = await channel.guild.channels.fetch(c);
					if (cat.children.size < ops.catLimit / 2) {
						console.log(`[${dateToTime(new Date())}]: Swapping raid announce channel ${raidAnnounceChannelId} from ${oldCategory.name} to ${cat.name}`);
						timedOut = oldCategoryId;
						setTimeout(() => {
							timedOut = false;
						}, 30000);
						pokenavChannel.send(`<@428187007965986826> set raid-lobby-category ${raidAnnounceChannelId} ${cat.id}`);
						break;
					}
				}
			}
		}
  },
  addRaidCat(cat, ch, sId) {
		const list = serverLists.get(sId);
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
  async removeRaidCat(id, sId) {
		const list = serverLists.get(sId);
			if (list.get(id)) {
				list.delete(id);
				await module.exports.saveRaidCatList();
				return;
			} else throw "not";
  },
  loadRaidCatList(folder, sId) {
		let list = new Discord.Collection();
		if (!folder) folder = lookup.get(sId);
    return new Promise(function(resolve, reject) {
      new Promise((res) => {
        try {
          delete require.cache[require.resolve(`../server/${folder}/raidCatList.json`)];
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
          const jsonList = require(`../server/${folder}/raidCatList.json`);
          for (const g in jsonList) {
            list.set(g, jsonList[g]);
          }
          const catAmount = list.reduce((acc, item) => {
            acc = acc + item.length;
            return acc;
          }, 0);
          console.log(`Raid Category list loaded. It contains ${catAmount} categories linked to ${list.size} channels.`);
					serverLists.set(sId, list);
					lookup.set(sId, folder);
          resolve(list);
        } catch (e) {
          if (e.code == "MODULE_NOT_FOUND") {
            fs.writeFile(path.resolve(__dirname, `../server/${folder}/raidCatList.json`), JSON.stringify(Object.fromEntries(list)), (err) => {
              if (err){
                reject(`Error thrown when writing the raidCat list file. Error: ${err}`);
                return;
              }
              console.log("Could not find raidCatList.json. Making a new one...");
              list = require(`../server/${folder}/raidCatList.json`);
							serverLists.set(sId, list);
							lookup.set(sId, folder);
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
  saveRaidCatList(sId) {
		const folder = lookup.get(sId);
    return new Promise((resolve) => {
      fs.writeFile(path.resolve(__dirname, `../server/${folder}/raidCatList.json`), JSON.stringify(Object.fromEntries(serverLists.get(sId))), (err) => {
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
