const { SlashCommandBuilder } = require('@discordjs/builders');

const { globalAndTestGuildId } = require('../config.json');
const { minesweeperGame } = require('../models');
const resolveName = require('../utils/resolvename');

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
    async execute(interaction) {
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
            && interaction?.guildId 
            || globalAndTestGuildId;
        const difficulty = interaction.options.getString("difficulty") || null;
        const whereObject = {};
        if (userId) whereObject.userId = userId;
        if (interaction.options.getBoolean('thisserver')) whereObject.guildId = guildId;
        if (difficulty) whereObject.difficulty = difficulty;

        const options = {
            order: [["time", "ASC"]],
            limit: 20 //for now!
        };
        if (Object.keys(whereObject).length > 0) {
            options.where = whereObject;
        }

        const foundModels = await selectedmodel.findAll(options);
        if (!foundModels.length) {
            interaction.reply(`Nothing found, wow!` + ((interaction.user.id === userId || "") && " Go set a record!")); 
            return;
        };

        let displayString = "";

        //So many awaits that I need to defer a reply!
        //TODO: something other than this!
        interaction.reply("Getting the leaderboard!");

        //Previous was a bunch of promises, changed to a synchronous for loop to avoid data race issues destroying the order
        //of displayString
        for (const foundModel of foundModels) {
            const { displayName } = await resolveName(await client.users.fetch(foundModel.userId), null, "ymous");
            let serverName;
            try {
                serverName = foundModel.guildId === globalAndTestGuildId || !foundModel.guildId
                    ? "[Global]" 
                    : (await client.guilds.fetch(foundModel.guildId)).name;
            } catch (error) {
                serverName = "[Unknown Server]";
                console.log(`Note: could not get the guild (${foundModel.guildId}). Error:`, error);
            }
            displayString +=
                `User: ${
                    displayName
                } | Server: ${
                    serverName
                } | Difficulty: ${
                    foundModel.difficulty
                } | Time: ${
                    (foundModel.time / 1000).toFixed(3)
                }\n`
        }
        //TODO slice this up into chunks in a util file. Or paginate it.
        interaction.editReply(displayString.substring(0, 1999));
        
    }
}