const { SlashCommandBuilder } = require('@discordjs/builders');

const indexRoot = process.cwd()
const { globalAndTestGuildId, database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js');
const minesweeperGame = databaseModels.minesweeperGame(sequelize, Sequelize.DataTypes);
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);

userInfo.hasMany(minesweeperGame, {sourceKey: 'userId'});
userInfo.sync();
serverInfo.hasMany(minesweeperGame, {sourceKey: 'serverId'});
serverInfo.sync();

minesweeperGame.belongsTo(userInfo, {
    targetKey: 'userId'
});
minesweeperGame.belongsTo(serverInfo, {
    targetKey: 'serverId'
})
minesweeperGame.sync(/*{force:true}*/);

const resolveName = require('./../utils/resolvename');

//TODO: make a games.js to store some difficulty values or something
//seems like the perfect command to use the menu system /shrug

module.exports = {
    guildCommand: false,//true,//temporary
	data: new SlashCommandBuilder()
    .setName('leaderboards')
		.setDescription('Pull up leaderboards for all the things.')
        .addStringOption(option => 
            option.setName('leaderboard')
            .setDescription('What leaderboard do you want to pull up?')
            .addChoices({name: 'Minesweeper', value: 'Minesweeper'})
            .setRequired(true)
        )
        .addUserOption(option =>
            option.setName("user")
            .setDescription("Filter by user")
        )
        .addBooleanOption(option =>
            option.setName("thisserver")
            .setDescription("Filter by this server only.")
        )
        .addStringOption(option =>
            option.setName("difficulty")
            .setDescription("Filter by difficulty, if aplicable.")
            .addChoices(
                {name: 'Easy', value: 'Easy'},
                {name: 'Medium', value: 'Medium'},
                {name: 'Hard', value: 'Hard'},
                {name: 'Very Hard', value: 'Very Hard'}
            )
        )
    ,
    execute(interaction) {
        const client = interaction.client;
        let selectedmodel;
        switch(interaction.options.getString('leaderboard')) {
            case "Minesweeper":
                selectedmodel = minesweeperGame;
                break;
            default:
                console.error("Uh oh, no model selected");
        }
        const userId = interaction.options.getUser('user')?.id || null;
        const guildId = interaction.options.getBoolean("thisserver") 
            && interaction?.guild?.id 
            || globalAndTestGuildId;
        const difficulty = interaction.options.getString("difficulty") || null;
        const whereObject = {};
        if (userId) whereObject.userInfoUserId = userId;
        if (interaction.options.getBoolean('thisserver')) whereObject.serverInfoServerId = guildId;
        if (difficulty) whereObject.difficulty = difficulty;
        const inclusionsArray = [];


        const userObject = {};
        userObject.model = userInfo;
        //userObject.where = {userId: userId}; remember, i got it up there
        inclusionsArray.push(userObject);

        const orderArray = []
        if (selectedmodel === minesweeperGame) {
            orderArray.push(["time", "ASC"]);
        }

        const options = {};
        if (Object.keys(whereObject).length>0) {
            options.where = whereObject;
        }
        if (inclusionsArray.length > 0) {
            options.include = inclusionsArray;
        }
        if (orderArray.length > 0) {
            options.order = orderArray;
        }
        //TODO: sort by time.
        const entries = selectedmodel.findAll(options).then(async (foundModels) => {
            if (!foundModels.length) {
                interaction.reply(`Nothing found, wow!` + ((interaction.user.id === userId || "") && " Go set a record!")); 
                return;
            };
            let displayString = "";
            const promises = foundModels.map(async (foundModel) => {
                const { displayName } = await resolveName(await client.users.fetch(foundModel.userInfoUserId), null, "ymous");
                let serverName;
                try {
                    serverName = foundModel.serverInfoServerId === globalAndTestGuildId || !foundModel.serverInfoServerId
                        ? "[Global]" 
                        : (await client.guilds.fetch(foundModel.serverInfoServerId)).name
                } catch (error) {
                    serverName = "[Unknown Server]"
                    console.log("Note: could not get the guild. Error:", error);
                }
                displayString +=
                    `User: ${
                        displayName
                    } | Server: ${
                        serverName
                    } | Difficulty: ${
                        foundModel.difficulty
                    } | Time: ${
                        foundModel.time / 1000
                    }\n`
            });
            await Promise.all(promises);
            //TODO slice this up into chunks in a util file. Or paginate it.
            interaction.reply(displayString.substring(0, 1999));
        });
        
    }
}