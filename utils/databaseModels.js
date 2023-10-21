const fs = require('fs');
const indexRoot = process.cwd()

const triggerWords = fs.readdirSync(indexRoot+'/triggerwords').filter(file => file.endsWith('.js'));
var defaultServerSettings = {
    anonymizeName: true,
    allowhyperchats: true,
};
for (const file of triggerWords) {
    defaultServerSettings[file] = true;
}

const defaultUserSettings = {
    anonymizeTag: "Server"
}


module.exports = {
    userInfo: function(sequelize, Sequelize) {//really they should just be user/server and not userInfo/serverInfo
        return sequelize.define('userInfo', {
            userId: {
                type: Sequelize.STRING,
                unique: true,
                primaryKey: true
            },
            settings: {
                type: Sequelize.JSON
            },
            settingsPage: {
                type: Sequelize.INTEGER
            },
            introSelected: {
                type: Sequelize.STRING,
                defaultValue: "none"
            }
        });
    },
    userInfoDefault: async function(userInfo, userId, inclusions) {
        var currentUserInfo = await userInfo.findByPk(userId)//perhaps switch inclusions to a more general "options"
        if (!currentUserInfo) {
            currentUserInfo = {
                userId: userId,
                settings: defaultUserSettings,
                settingsPage: 0,
                introSelected: null
            }
            userInfo.create(currentUserInfo);
            currentUserInfo = await userInfo.findByPk(userId, {include: inclusions});// why fetch it again? A; format issue
        } else {
            //pls repair/update with new settings here
        }
        if (inclusions) {
            currentUserInfo = await userInfo.findByPk(userId, {include: inclusions});// why fetch it again? A; format issue
        }
        return currentUserInfo;
    },
    serverInfo: function(sequelize, Sequelize) {
        return sequelize.define('serverInfo', {
            serverId: {
                type: Sequelize.STRING,
                unique: true,
                primaryKey: true,
            },
            serverSettings: {
                type: Sequelize.JSON
            },
            serverSettingsPage: {
                type: Sequelize.INTEGER
            }
        });
    },
    serverInfoDefault: async function(serverInfo, guildId, inclusions) {//i will need some inputs or something
        //note: add new server settings if not there!
        var currentServerInfo = await serverInfo.findByPk(guildId, {include: inclusions});//i should just try catch it would be easier...
        if (!currentServerInfo) {
            console.log(`creating new serverInfo for ${guildId}`);
            //means i can dynamically add trigger words without restarting the bots.
            //definitely a feature, not a defficiency!

            //also please calculate default default channel in here (no typos here)
            currentServerInfo = {
                serverId: guildId,
                serverSettings: defaultServerSettings,
                serverSettingsPage: 0,
            }
            
            serverInfo.create(currentServerInfo);
            currentServerInfo = await serverInfo.findByPk(guildId, {include: inclusions});
        } else {
            //pls repair/update with new settings here

            // var currentServerSettings = currentServerInfo.get("serverSettings")
            // //console.log(currentServerSettings);
            // for (property in defaultServerSettings) {
            //     if (!currentServerSettings[property]) {
            //         currentServerSettings[property] = defaultServerSettings[property]
            //         //console.log("Couldn't find " + property + "!");
            //     }
            // }
            // serverInfo.update({serverSettings: currentServerSettings}, {where: {serverId: guildId}});
            // currentServerInfo = await serverInfo.findOne({where: {serverId: guildId}})
        }
        return currentServerInfo;
        //consider redoing this function so that it just creates the thing, not gets it?
    },
    minesweeperGame: function(sequelize, seqDatatypes) {
        return sequelize.define('minesweeperGame', {
            time: {
                type: seqDatatypes.INTEGER//measured in ms
            },
            difficulty: {
                type: seqDatatypes.STRING
            }
        });
    },
    blacklistItem: function(sequelize, seqDatatypes) {
        return sequelize.define('blacklistItem', {
            //scary associations. do i add a userId?
            //i mean, it will belong to a user

            //update:
            // userId: {
            //     type: seqDatatypes.STRING//should this be here?! i thought it should auto add with belongsto. pls help
            // },
            severity: {
                type: seqDatatypes.INTEGER,
                validate: {min : 1, max: 4}
            }
            // , replaced with serverId association
            // global: {
            //     type: seqDatatypes.BOOLEAN
            // }
        });
    },
    listeningChannel: function(sequelize, seqDatatypes) {
        return sequelize.define('listeningChannel', {
            channelId: {
                type: seqDatatypes.STRING
            },
            category: {
                type: seqDatatypes.STRING
            }
        })
    },
    quote: function(sequelize, seqDatatypes) {
        return sequelize.define('quote', {

            //possible serverId serverInfo association
            channelId: {//optional
                type: seqDatatypes.STRING
            },
            messageId: {//optional
                type: seqDatatypes.STRING
            },

            content: {//"applesauce"
                type: seqDatatypes.STRING,
                allowNull: false
            },
            //quotedUser userInfo
            //only display based on anonymity setting
            //make sure to show the user if the quote
            //is verified or not, whether or not
            //messageId/channelId is filled in for a
            //direct link to the original message
            shownSource: {
                type: seqDatatypes.STRING,
            }
            //archiverId userInfo
                //*recorded by aBadNameSniper*
        })
    }
}