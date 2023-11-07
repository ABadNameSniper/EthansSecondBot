const indexRoot = process.cwd()
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);

const databaseModels = require('./databaseModels');
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes)



module.exports = async function(user, member, anonSuffix = '', embedColor = "#000000") {
    //future self: see if there's any way to get settings column all by itself
    const anonymizeTag = (await databaseModels.userInfoDefault(userInfo, (user || member).id)).get("settings").anonymizeTag;

    let displayName;
    let avatarURL;

    if (anonymizeTag === "Anonymous") {
        displayName = "Anon" + anonSuffix
    } else if (user || anonymizeTag !== "Server") {
        displayName = user[anonymizeTag === "None" && "username" || "displayName"];
        embedColor = user.hexAccentColor || (await user.fetch()).hexAccentColor;
        avatarURL = user.displayAvatarURL({dynamic: true, size: 64});
    } else { //Assuming member exists
        displayName = member.displayName;
        embedColor = member.displayHexColor;
        avatarURL = member.displayAvatarURL({dynamic: true, size: 64});
    }

    return {
        displayName,
        embedColor,
        avatarURL
    };
}