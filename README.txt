Ethan's Second Bot



i removed some some dependencies from package.json in an effort to clean this up. They may need to be reinstalled

## TODO


support private broadcast channels

better error handling for broadcasts transmissions to unallowed channels (dm server owner?)

/introlist should just be a page in /settings

broadcasting system should be it's own DB table or something

/flipbook new/edit/delete/editSettings command and subcommand!! that would be fun

Hyperchats in threads update: maybe make it an optional argument, and the default can be set with serverSettings

rewrite editing system so that it caches sent message ids (send.then(;alskdjf;asf))

convert everything into ES modules instead of CJS

replace discord-tts with a better solution using just the normal google-tts-api

modifying discordjs's user caching system to include blacklist levels and hyperchat messages would've been useful. Maybe next time.

was checking permissions for trigger words necessary? It might've been easy just to do better error handling.

should've done better caching for users on top of discord.js

change privacy settings to more accurately reflect display name vs username

fix weird double embedding bug with hyperchats?

combine serverInfoDefault/userInfoDefault into something much, much better. Eliminate all rogue FindOnes
+ provide the user row to each command (with verification/permissions) in the command handler, as a second argument

replying to hyperchats should reply to the original message
 
remove permissionHierarchy.broadcasts, put that all into the database. Dynamic categories or something

maybe lint the source code?

make menu system more encompassing instead of having the same menu code pasted on 4 different commands

