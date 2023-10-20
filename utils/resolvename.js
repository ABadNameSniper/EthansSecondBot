const indexRoot = process.cwd()
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);

const databaseModels = require('./databaseModels');
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes)



module.exports = async function(user, member, isDM = false, anonSuffix = '', embedColor = "#000000") {
    //future self: see if there's any way to get settings column all by itself
    const anonymizeTag = (await databaseModels.userInfoDefault(userInfo, user.id)).get("settings").anonymizeTag;

    let displayName;
    let avatarURL;

    if (anonymizeTag === 'None') {
        displayName = user.username;
        embedColor = user.hexAccentColor;
        avatarURL = user.displayAvatarURL({dynamic: true, size:64})
    } else if (anonymizeTag === 'Server' && !isDM) {
        if (member) {
            displayName = member.displayName;
            embedColor = member.displayHexColor;
            avatarURL = member.displayAvatarURL({dynamic: true, size:64});
        } else {
            displayName = user.displayName;
            embedColor = user.hexAccentColor;
            avatarURL = user.displayAvatarURL({dynamic: true, size:64})
        }        
    } else {
        displayName = 'Anon' + anonSuffix;
    }

    return {
        displayName,
        embedColor,
        avatarURL
    };
}