# PokeNav helper mini bot
This is a mini bot developed for the Pokemon GO Raids discord server.  
Its main function is to clean up certain PokeNav messages that are considered spammable by annoying server members, based on a couple of different cases.

## Functions

#### 1. PokeNav cleanup
Use `]add <group> [channel/id]` to add a channel to a filter
The `raid` group is intended to be used in PokeNav raid announce channels. The bot will only retain raid embed messages and delete everything else.
The `badge` group is intended to be used for the badge granting channel. It automatically deletes successful badge grant and revoke embeds, allowing for a clean channel.
The `pvpiv` group deletes any PokeNav message that isn't related to pvp checking. I haven't really used this one, so not sure how good it is.
The cases are shown and explained in the [func/filter.js](func/filter.js) file.

## Setup
First you will need [node 16 and npm 7](https://nodejs.org/en/download/current/) installed.
To add the bot to your own server, you will need to make a bot user and acquire its "Token".
* Go [here](https://discord.com/developers) to do that (use [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html) if you need help).
* Download or clone the files in this repo.
* setup.bat should be run to create some node files that are not included in the GitHub repo
* You need to make a "server" folder with a *config.json* file. An example is included in "server template"
* The config file needs a `prefix`, your `serverID` and your bot `token` from earlier.
* run start_bot.bat to start the bot server

#### Permissions

Here are the permissions required for the bot:  
* View (only applies to channels you intend to use it in)
* Add reactions (Used as feedback for `]add` and `]remove`)
* Send Messages
* Manage messages

#### Settings
These settings can be changed in *config.json* file
|Setting|Function|
|-----|-----------|
|prefix|The prefix for bot commands|
|serverID|The Discord server ID that you want the bot to work in|
|activity|The presence activity of the bot|
|modRole|The staff role. Used for command permission checking|

## Commands

#### PokeNav Cleanup
`group` needs to be either `raid`, `badge`, or `pvpiv`
You can run these commands within the target channel without having to specify it.

|Usage|Description|
|-----|-----------|
|`]add <group> [channel id/tag]`| Adds the channel to the Pokénav filter list|
|`]remove <group> [channel id/tag]`| Removes the channel from the Pokénav filter list|

#### Info
|Usage|Description|
|-----|-----------|
|`]ping`|Shows the latency of the bot. **Usable by everyone**|
|`]help [command name]`|Shows a list of all commands|
|`]list`|Lists all the group's currently filtered channels|
|`]ver`|Responds with the current version of the bot|

#### Admin
Note: These two commands may function incorrectly based on which process manager you use

|Usage|Description|
|-----|-----------|
|`]quit`|Force closes the bot|
|`]restart`|Force restarts the bot|

## License
Copyright (C) Soul Green - All Rights Reserved  
Unauthorized use of this code is prohibited without express permission

## Final words
I am an amateur developer. I am also stupid.  
If I've made any mistakes or if you encounter an error, feel free to correct me, yell at me, or make an issue in the issues tab.
You can find me on discord at soulus#3935<@146186496448135168>.
