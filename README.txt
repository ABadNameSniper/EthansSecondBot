Ethan's Second Bot

It's another fun project, brought to you by -- well I'm sure you can guess.
It has pretty good minesweeper and frequent updates.
Thank you so much Dragonhelm for the profile picture!

## TODO

### Broadcasts
broadcasting system should be it's own DB table or something
support private broadcast channels
better error handling for broadcasts transmissions to unallowed channels (dm server owner?)
remove permissionHierarchy.broadcasts, put that all into the database. Dynamic categories or something

### Hyperchats
Hyperchats in threads update: maybe make it an optional argument, and the default can be set with serverSettings
fix weird double embedding bug with hyperchats?
replying to hyperchats should reply to the original message -- MAYBE
some variety of flavor text when joining and leaving hyperchannels could be fun
decide on "hyperchats" or "hyperchannels" maybe. It's a weird mix of both right now.

### Misc.

/introlist should just be a page in /settings

/flipbook new/edit/delete/editSettings command and subcommand!! that would be fun

convert everything into ES modules instead of CJS

replace discord-tts with a better solution using just the normal google-tts-api

Is checking permissions for trigger words necessary? It might be easier just to do better error handling.

change anonymity level setting to: username, display, and anonymous

combine serverInfoDefault/userInfoDefault into something much, much better. Eliminate all rogue FindOnes
+ provide the user row to each command (with verification/permissions) in the command handler, as a second argument

maybe lint the source code?

make menu system more encompassing instead of having the same menu code pasted on 4 different command