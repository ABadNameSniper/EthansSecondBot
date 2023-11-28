const { savedUser } = require('../models');

module.exports = async function(user, member, anonSuffix = '', embedColor = "#000000") {
    //future self: see if there's any way to get settings column all by itself
    const [currentUser] = await savedUser.findOrCreate({where: {userId: user.id}})
    const anonymizeTag = currentUser.settings.anonymizeTag;

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