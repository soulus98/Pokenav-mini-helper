# v2.0 (2022-Aug-05)
* Made the bot multi-server
* Fixed `]n` and `]cn` to work without `$counters`
* Added `]update-api` to update api when outdated

#### v2.0.1 (2022-Aug-13)
* Added a **mentionable** toggle for role creation

#### v2.0.2 (2022-Aug-31)
* Changed role names to Pascal_Snake_CaseRaid
* Fixed some bugs in the notify system

#### v2.0.3 (2022-Sep-25)
* Swapped to official asset sprites in `]notify`
* Fixed override & reworked it to allow multiple bosses/emoji
* Fixed `]api update`
* Saved some API calls by checking the reactions before reacting
* Removed temporary footer tier info
* Fixed a few more bugs in `]notify` and `]cn`

# v1.3 (2022-Jul-07)
* Made a raid announce channel category switcher for PokeNav
 * Use `arc` and `rrc` to link categories to announce channels, and when they reach **catLimit** channels, it will swap to another linked category, so long as that category has less than half of **catLimit** channels
* Added `]notify`, to streamline raid notifications and remove the need for carl's rr module
* Removed the verify responder, as that belongs in the main bot
* Added **pokenavChannel** and **notifyReactionChannel** settings, for the above features

#### v1.3.1 (2022-Jul-13)
* Small bug fixes in `]notify`

#### v1.3.2 (2022-Jul-15)
* Added `]override` for when the tier is unknown
* More small bug fixes:
 * Changed the default rest timeout to 60s from 15s
 * Made ]n and ]cn only work in pokenavChannel
 * Made things go in the right orders

#### v1.3.3 (2022-Jul-25)
* Small bug fixes in `]notify`
* Added a profile group for cleanup

#### v1.3.4 (2022-Jul-29)
* Fixed `]rrc`
* Added a catch for when an emoji isn't available

#### v1.3.5 (2022-Aug-01)
* Added a `$r` autoresponder
* Added color and bold to the notification embeds

#### v1.3.6 (2022-Aug-03)
* Fixed the autoresponder
* Split `]list` into `]list categories`, `]list cleanup`, and `]list notifications`
* Added :eyes: in ]n and ]cn
* Channel link in ]n updated message

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
