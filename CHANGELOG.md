# v1.3 (2022-Jul-07)
* Made a raid announce channel category switcher for PokeNav
 * Use `arc` and `rrc` to link categories to announce channels, and when they reach **catLimit** channels, it will swap to another linked category, so long as that category has less than half of **catLimit** channels
* Added `]notify`, to streamline raid notifications and remove the need for carl's rr module
* Removed the verify responder, as that belongs in the main bot
* Added **pokenavChannel** and **notifyReactionChannel** settings, for the above features

#### v1.3.1 (2022-Jul-13)
* Small bug fixes in `]notify`

# v1.2 (2022-Jun-06)
* Updated to where the main bot's cleanup process was at:
 * Made the bot greedy, deleting *everything* that isn't a raid.
 * Updated cleanup to work with slash commands, and made 3 groups: `raid`, `badge`, and `pvpiv`.
 * Added a mandatory `group` argument to the `]add` and `]rem` commands. `]rem` can have `all` as the group to easily remove it from all 3 groups
* Added `list` command to see which channels are currently on the filter list
* Expanded the `help` command to include command groups

# v1.1
* Added a `$verify` responder that works in any channel that the bot can see that *isn't* being filtered.
* Added **respondVerify** as a toggle and a messagetxt.js entry

# v1.0
* New bot. Read the [README file](README.md) for information

#### v1.0.1 (2021-Oct-02)
* Removed a catastrophic filter issue where it would delete raid embeds!
* Added "User is on cooldown" to the Pokenav filter
* Added channel name to add and remove commands console logs

#### v1.0.2 (2021-Oct-07)
* Added websocket listeners for a stable activity status
