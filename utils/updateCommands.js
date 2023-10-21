const { REST } = require('@discordjs/rest');
const fs = require('fs');
const { Routes } = require('discord-api-types/v9');
const indexRoot = process.cwd()
const { clientId, token, permissionHierarchy } = require(`${indexRoot}/config.json`);
const rest = new REST({ version: '9' }).setToken(token);
const commandsFolderPath = indexRoot+'/commands';
const commandFiles = fs.readdirSync(commandsFolderPath).filter(file => file.endsWith('.js'));
const baseGuildCommands = [];
const baseApplicationCommands = [];
const adminPermissions = permissionHierarchy.admins.map((id) => {
    return {
        id,
        type: 'USER',
        permission: true,
    }
})

for (const file of commandFiles) {
	const command = require(`${commandsFolderPath}/${file}`); 
    if (command.guildCommand && !command.guildWhitelist) {
        baseGuildCommands.push(command.data.toJSON());
    } else if (!command.guildWhitelist) {
	    baseApplicationCommands.push(command.data.toJSON());
    }
}

//turn null/single guildId to array of guildIds
const formatGuildIds = async function(guildIds, client) {
    if (!guildIds) {
        guildIds = (await client.guilds.fetch()).keys();
        //guildIds = client.guilds.cache.keys();
    } else if (typeof(guildIds)==="string") {
        guildIds = [guildIds];
    }
    return guildIds;
}

const getCurrentGuildCommands = function(guildCommandNames, guildId, replace) {
    //asume guildId formatted nicely
    let currentGuildCommands = baseGuildCommands;
    guildCommandNames = commandFiles;//aaaaa
    currentGuildCommands = [];
    for (commandName of guildCommandNames) {
        const command = require(`${commandsFolderPath}/${commandName}`/*.js`*/);//don't forget slash or something idk
        if (
            command.guildCommand //must be a guild command
            && (//if whitelist, must be on whitelist
                !  command?.guildWhitelist 
                || command?.guildWhitelist.includes(guildId)
            )
        ) {
            currentGuildCommands.push(command.data.toJSON());
        }
    }
    return(currentGuildCommands);
}

//A sneaky idea might be putting permission information in the command file itself. I kinda did try that before...
module.exports = {
    updateApplicationCommands: function(client, applicationCommandNames) {
        //i'll cross this bridge later.
        rest.put(//check for duplicates before here pls
            Routes.applicationCommands(clientId),
            { body: baseApplicationCommands },
        );
    },
    updateGuildCommands: async function(client, guildIds, guildCommandNames, replace = true) {//replace could be unnecessary
        guildIds = await formatGuildIds(guildIds, client);
        for (const guildId of guildIds) {
            const currentGuildCommands = getCurrentGuildCommands(guildCommandNames, guildId/*, replace*/);
            client.guilds.fetch(guildId).then(guild => {
                console.log(guildId, guild.name);
            })
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: currentGuildCommands}
            )
        }
    },
    updateGuildCommandPermissions: async function(client, guildIds, commandNames) {//should include appcmds too, right?
        //wow i REALLY need to get this fine-tunable. Add specific command permissions, give permissions based on mod status (from DB)
        //I mean it's called update after all, so it should really be doing some removing of permissions too.
        if (typeof(commandNames) === 'string') {
            commandNames = [commandNames];
        }
        guildIds = await formatGuildIds(guildIds, client);
        for (const guildId of guildIds) {
            const guild = await client.guilds.fetch(guildId);
            guild.commands.fetch().then(map => {
                map.forEach(command => {
                    //I guess I could start with a seeking approach...? Wouldn't i need commandid first tho?
                    if (commandNames && !commandNames.includes(command.name)) return; 
                    console.log(`Updating permissions for ${command.name} at ${guild.name} (${guildId})`)
                    command.permissions.add(
                        {//guild and command id already defined
                            permissions:[//mm expanded
                                ...adminPermissions,
                                {
                                    id: guild.ownerId,
                                    type: 'USER',
                                    permission: true
                                }
                            ]
                        }
                    );
                    require(`${commandsFolderPath}/${command.name}`)?.permittedUserIds?.forEach(userId => {
                        command.permissions.add({permissions:[{id: userId, type: 'USER', permission: true}]})
                    });
                })
            })
        }
    }
}