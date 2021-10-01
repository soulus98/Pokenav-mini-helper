# Pokenav helper mini bot
This is a mini bot developed for the PoGo raids discord server.  
Its function is to delete certain pokenav messages from raid announce channels.  
At the moment, it deletes most error messages and messages such as `$verify` and any profile changing messages.  
If you see any messages that it doesn't delete, or if you noticed that Pokenav changed their wording so it no longer works, please let me know in the issues tab.

## Setup
First you will need [node 16 and npm 7](https://nodejs.org/en/download/current/)  installed.
To add the bot to your own server, you will need to make a bot user and acquire its "Token".
* Go [here](https://discord.com/developers) to do that (use [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html) if you need help).
* Download or clone the files in this repo.
* setup.bat should be run to create some node files that are not included in the Github repo
* You need to make a "server" folder with a config.json file. An example is included in "server template"
* The config file needs a `prefix`, your `serverID` and your bot `token` from earlier.
* run start_bot.bat to start the bot server

This bot needs certain permissions to run properly.  
Here are the permissions required for the bot:  
* View (only applies to channels you intend to use it in)
* Add reactions (Used as feedback for `]add` and `]remove`)
* Send Messages
* Manage messages

## Commands
This bot uses `]add` and `]remove` so that you can specify which channels are to be filtered  
Use `]add` in the channel you wish to add, or use `]add <id/tag>` if you wish to specify a different channel

## Licence
Copyright (C) Soul Green - All Rights Reserved  
Unauthorized use of this code is prohibited without express permission

## Final words
I am an amateur developer. I am also stupid.  
If I've made any mistakes or if you encounter an error, feel free to correct me, yell at me, or make an issue in the issues tab.
You can find me on discord at soulus#3935<@146186496448135168>.
