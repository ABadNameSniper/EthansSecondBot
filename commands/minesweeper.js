const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder,  ButtonStyle, ComponentType } = require('discord.js');
const indexRoot = process.cwd()
const { globalAndTestGuildId, database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js');
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);
const minesweeperGame = databaseModels.minesweeperGame(sequelize, Sequelize.DataTypes);

userInfo.hasMany(minesweeperGame, {sourceKey: 'userId'});
serverInfo.hasMany(minesweeperGame, {sourceKey: 'serverId'});

userInfo.sync();
serverInfo.sync();


minesweeperGame.belongsTo(userInfo, {
    targetKey: 'userId'
});
minesweeperGame.belongsTo(serverInfo, {
    targetKey: 'serverId'
})
minesweeperGame.sync({alter: true});


const safeIncrement = function(array2d, x, y) {
    if (array2d?.[x]?.[y]!==undefined && array2d[x][y]!==true) {
        array2d[x][y]++;
    }
    return array2d;
}

var playerData = {
    /*
    '135904873923832': {
        x: int,
        y: int,
        lastXButton: String,
        lastYButton: String
    }
    */
}

const topStringOG = [
    "💣",":zero:",":one:",":two:",":three:",":four:",":five:",":six:",":seven:",":eight:",":nine:",
    ":keycap_ten:",":bangbang:", "12 ", "13 ", "14 ", "15 ", "16 ", "17 ", "18 ", "19 ", "💣","\n"
];
const letterChars = '🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽';//pls automate by turning ints into chars or something
const numberEmojis = ['🟦', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:', ':seven:', ':eight:'];

const searchAndSetStyle = function(customId, style, rows, toggleStyle) {
    if (!customId) return;
    for (let msgActionRow of rows) {
        for (let component of msgActionRow.components) {
            const custom_id = component.data.custom_id;
            if (custom_id === customId) {
                //flip the style
                component.setStyle(
                    !toggleStyle ? 
                        style 
                    : component.data.style === style ? 
                        toggleStyle
                    : style
                );
                break;
            }
        }
    }
}

module.exports = {
    guildCommand: false,
	data: new SlashCommandBuilder()
		.setName('minesweeper')
		.setDescription('minesweeper gaming')
        
        .addStringOption(option => 
            option.setName('difficulty')
            .setDescription('Easy: 4x5, 4💣. Medium: 9x10, 7💣. Hard: 9x15, 16💣. Very Hard: 12x12, 24💣. Default: Hard')
            .addChoices(
                {name: 'Easy', value: 'Easy'},
                {name: 'Medium', value: 'Medium'},
                {name: 'Hard', value: 'Hard'},
                {name: 'Very Hard', value: 'Very Hard'}
            )
        )
        .addIntegerOption(option =>
            option.setName("mines")
            .setDescription("Set for mine amount. Setting will change difficulty to custom, so you won't appear on leaderboards.")
            .setMinValue(1)
        )
        .addIntegerOption(option =>
            option.setName('width')
            .setDescription('Changes grid width. Setting will change difficulty to custom, so you won\'t appear on leaderboards.')
            .setMinValue(4)
            .setMaxValue(12)
        )
        .addIntegerOption(option =>
            option.setName('height')
            .setDescription('Changes grid height. Setting will change difficulty to custom, so you won\'t appear on leaderboards.')
            .setMinValue(4)
            .setMaxValue(12)
        ),
	async execute(interaction) {
        const userId = interaction.user.id
        
        const endGame = function(additionalMessage, scaryOutside) {
            playerData[userId]?.buttonCollector?.stop();//had an err where buttonCollector didn't exist. Weird.
            playerData[userId]?.messageCollector?.stop();
            if (scaryOutside) return;
            gameDisplayString = topString;
            for (let i = 0; i < visibleField.length; i++) {
                gameDisplayString += letterChars.substring(i*2,i*2+2);
                for (let j = 0; j < visibleField[i].length; j++) {
                    if (visibleField[i][j] === true) {
                        gameDisplayString+=':boom:';
                    } else {
                        if (field[i][j]===true) {
                            gameDisplayString+="💣"
                        } else {
                            gameDisplayString+=numberEmojis[field[i][j]]
                        }
                    }
                }
                gameDisplayString+=letterChars.substring(i*2,i*2+2);
                gameDisplayString+='\n';
            }
            gameDisplayString+=topString;
            gameDisplayString+=additionalMessage;

            for (let msgActionRow of rows) {
                for (let component of msgActionRow.components) {
                    component.setDisabled(true);
                }
            }
            playerData[userId].gameEnd = true;
            interaction.editReply(
                {content: gameDisplayString, components: rows}
            );
        }
        //if there's been a previous game and it hasn't been ended
        if (playerData?.[userId]?.gameEnd === false) {
            endGame("Ending game, it looks like a new one was started.", true)
            //stop collectors?
        }

        playerData[userId] = {
            x: null,
            y: null,
            lastXButton: null,
            lastYButton: null,
            flagging: false,
            gameEnd: false
            //
            //the collectors too
        }

        let width, height, minesAmount, difficulty;
        difficulty = interaction.options.getString('difficulty')
        switch (difficulty) {
            case 'Easy':
                width = 4;
                height = 5;
                minesAmount = 4;
                break;
            case 'Hard':
                width = 9;
                height = 15;
                minesAmount = 16;
                break;
            case 'Very Hard':
                width = 12;
                height = 12;
                minesAmount = 24;
                break;
            default://Medium
                width = 9;
                height = 10;
                minesAmount = 7;
                //Must be explicitly set for anything else
                difficulty = 'Medium';
                
        }

        if (interaction.options.getInteger('mines')) {
            difficulty = 'Custom';
            minesAmount = interaction.options.getInteger('mines');
            if (minesAmount<1) {
                interaction.reply("You must have at least 1 mine!")
                return;
            }
        }
        if (interaction.options.getInteger('width')) {
            difficulty = 'Custom';
            width = interaction.options.getInteger('width');
            if (width<4){
                interaction.reply("The grid has got to be at least 3 spaces wide!")
                return;
            }
        }
        if (interaction.options.getInteger('height')) {
            difficulty = 'Custom';
            height = interaction.options.getInteger('height');
            if (height<4){
                interaction.reply("The grid has got to be at least 3 spaces tall!");
                return;
            }
        }
        let rows = [];
        if (width + height > 24) {
            //maybe change this up when  I add text input
            interaction.reply(
                "Sorry, Discord isn't meant for minesweeper, " +
                "so with this control layout I can only add 24 buttons + the flag! Try making a smaller grid");
            return;
        } 
        if (minesAmount/(width*height)>0.4) {
            interaction.reply(
                `Sorry, the maximum mine concentration is 40%, you had ${
                    ((minesAmount/(width*height)*100).toString()).substring(0, 5)
                }% concentration.`
            );
            return;
        } else {
            //set up buttons
            let currentMAR = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                .setCustomId('flag')
                .setLabel('\uD83D\uDEA9')
                .setStyle(ButtonStyle.Danger)
            )
            let i = 1;

            for (i; i-1 < width; i++) {
                currentMAR.addComponents(
                    new ButtonBuilder()
                    .setCustomId((i-1).toString())
                    .setLabel((i-1).toString())
                    .setStyle(ButtonStyle.Secondary)
                );
                if ((i+1) % 5 === 0) {
                    rows.push(currentMAR)
                    currentMAR = new ActionRowBuilder()
                }
            }
            for (i; i < height + width + 1; i++) {
                currentMAR.addComponents(
                    new ButtonBuilder()
                    .setCustomId(String.fromCharCode(i+64-width))
                    .setLabel(String.fromCharCode(i+64-width))
                    .setStyle(ButtonStyle.Primary)
                );
                if ((i + 1) % 5 === 0 || i === height + width) {
                    rows.push(currentMAR)
                    currentMAR = new ActionRowBuilder()
                }
            }
        } 
        let topString = topStringOG.slice(0, width+1).join('')+'💣\n';
        let flagsAmount = 0;
        let squaresDug = 0;
        let winState = null;
        let field = Array(height);
        let visibleField = Array(height);
        for (let i = 0; i < field.length; i++) {
            field[i] = Array(width);
            visibleField[i] = Array(width);
            for (let j = 0; j < field[i].length; j++) {
                field[i][j] = 0;
                visibleField[i][j] = false;
            }
        }
        
        const dig = function(x, y) {
            //Clicked on a mine!
            if (field[y][x]===true) {
                visibleField[y][x] = true;
                winState = false;
            } else {
                visibleField[y][x] = numberEmojis[field[y][x]];
                squaresDug ++;
                if (field[y][x] === 0) {
                    for (let i = y-1; i < y + 2; i++) {
                        for (let j = x-1; j < x + 2; j++) {
                            if (
                                i < 0
                                || i >= field.length
                                || j < 0
                                || j >= field[i].length
                                || j < 0
                                || visibleField?.[i]?.[j]//already revealed
                            ) continue;
                            dig(j, i);
                        }
                    }
                }
                if (squaresDug === height * width - minesAmount) {
                    //win
                    winState = true;
                }
            }
        }
        let gameDisplayString = topString;
        for (let i = 0; i < visibleField.length; i++) {
            gameDisplayString+=letterChars.substring(i*2,i*2+2);
            for (let j = 0; j < visibleField[i].length; j++) {
                gameDisplayString+='⬜';
            }
            gameDisplayString+=letterChars.substring(i*2,i*2+2);
            gameDisplayString+='\n';
        }
        gameDisplayString+=
            topString
            + `\nDifficulty: ${difficulty} | Total Mines: ${minesAmount} | Mines Left: ${minesAmount-flagsAmount}`;
        const message = await interaction.reply({
            content: gameDisplayString,
            components: rows,
            fetchReply: true
        })
        
        let initialClickTime;
        let firstGuess;
        const inputFunction = function(playerInfo) {
            //consider moving up there
            //make sure to just not update the board if no valid move is put. Don't want to waste like a kilobyte of bandwidth!!
            if (playerInfo.x !== null 
                &&  playerInfo.y !== null 
                && playerInfo.x < width 
                && playerInfo.y<height
            ) {
                //add better "security"
                //this is the first guess.
                searchAndSetStyle(playerInfo.lastYButton, ButtonStyle.Primary, rows);
                searchAndSetStyle(playerInfo.lastXButton, ButtonStyle.Secondary, rows);
                
                playerInfo.lastXButton = null;
                playerInfo.lastYButton = null;

                if (!initialClickTime) {//don't use performance.now
                    initialClickTime = Date.now()
                }

                if (playerInfo.flagging===true) {
                    //flagging
                    if (visibleField[playerInfo.y][playerInfo.x]===false) {
                        visibleField[playerInfo.y][playerInfo.x] = "flag";
                        flagsAmount++;
                    } else if (visibleField[playerInfo.y][playerInfo.x]==='flag') {
                        visibleField[playerInfo.y][playerInfo.x] = false;
                        flagsAmount--;
                    }
                } else if (visibleField[playerInfo.y][playerInfo.x] === false) {
                    //digging
                    if (!firstGuess) {
                        let retryNum=0;
                        let placedBombs =0;
                        firstGuess = true;
                        for (let i = 0; i < minesAmount; i++) {//sus
                            let x = Math.floor(Math.random() * height);
                            let y = Math.floor(Math.random() * width);
                            if (
                                //y-x, x-x, width, height. what is it all?
                                field[x][y] !== true
                                && (
                                    Math.abs(playerInfo.y-x) > 1
                                    || Math.abs(playerInfo.x-y)>1
                                )
                            ) {
                                placedBombs++;
                                field[x][y] = true;
                                field = safeIncrement(field, x+1, y);//i don't like it
                                field = safeIncrement(field, x+1, y+1)
                                field = safeIncrement(field, x+1, y-1)
                                field = safeIncrement(field, x-1, y);
                                field = safeIncrement(field, x-1, y+1);
                                field = safeIncrement(field, x-1, y-1);
                                field = safeIncrement(field, x, y+1);
                                field = safeIncrement(field, x, y-1);
                            } else {
                                retryNum++;
                                i--;
                            }
                        }
                    }
                    dig(playerInfo.x, playerInfo.y);
                } else {
                    //chording
                    let flagsAround = 0;
                    for (let i = playerInfo.y-1; i < playerInfo.y + 2; i++) {
                        for (let j = playerInfo.x-1; j < playerInfo.x + 2; j++) {
                           if (visibleField?.[i]?.[j]==="flag") {
                               flagsAround++;
                           } 
                        }
                    }
                    flagsAround = numberEmojis[flagsAround];
                    if (flagsAround === visibleField[playerInfo.y][playerInfo.x]) {
                        for (let i = playerInfo.y-1; i < playerInfo.y + 2; i++) {
                            for (let j = playerInfo.x-1; j < playerInfo.x + 2; j++) {
                               if (visibleField?.[i]?.[j]===false) {
                                   dig(j, i);
                               } 
                            }
                        }
                    }
                }
                //display 
                gameDisplayString = topString;
                for (let i = 0; i < visibleField.length; i++) {
                    gameDisplayString+=letterChars.substring(i*2,i*2+2);
                    for (let j = 0; j < visibleField[i].length; j++) {
                        if (visibleField[i][j] === "flag") {
                            gameDisplayString+='\uD83D\uDEA9';
                        } else if (visibleField[i][j] === true) {
                            //end the game
                            gameDisplayString+=':boom:';
                        } else if (visibleField[i][j] === false) {
                            gameDisplayString+='⬜';
                        } else {
                            gameDisplayString+=visibleField[i][j];
                        }
                    }
                    gameDisplayString += letterChars.substring(i*2,i*2+2)+"\n";
                }
                gameDisplayString +=
                    topString
                    + `\nDifficulty: ${difficulty} |` 
                    + `Total Mines: ${minesAmount} | `
                    + `Mines Left: ${minesAmount-flagsAmount} | `
                    + `Time: ${(Date.now()-initialClickTime)/1000}s`;

                playerInfo.x = null;
                playerInfo.y = null;
            }
            if (winState === true ) {
                const msTime = Date.now()-initialClickTime;
                endGame(`\nDifficulty: ${difficulty} | ${minesAmount} mines complete in ${msTime/1000} seconds!`);
                if (difficulty==="Custom") return;
                minesweeperGame.create({
                    userInfoUserId: userId,
                    serverInfoServerId: interaction?.guild?.id || globalAndTestGuildId,
                    difficulty: difficulty,
                    time: msTime,
                });
            } else if (winState === false) {
                let correctFlags = 0;
                let incorrectFlags = 0;
                for (let i = 0; i < visibleField.length; i++) {
                    for (let j = 0; j < visibleField[i].length; j++) {
                        if (visibleField[i][j]==="flag"&&field[i][j]===true) {
                            correctFlags++;
                        } else if (visibleField[i][j]==="flag") {
                            incorrectFlags++;
                        }
                    }
                }

                endGame(
                    `Better luck next time!`
                    + `\nDifficulty: ${difficulty} | `
                    + `Spaces Dug: ${squaresDug} | ` 
                    + `Time: ${(Date.now()-initialClickTime)/1000} | `
                    + `Correct Flags: ${correctFlags} | `
                    + `Incorrect Flags: ${incorrectFlags}`
                );
                return;
            }

            playerData[userId] = playerInfo;

            interaction.editReply(
                {content: gameDisplayString, components: rows}
            );
        }
        //wait a second i really only need this for the buttons... otherwise... yeah...
        const buttonSelect = function(playerInfo, buttonId) {
            if (buttonId === 'flag') {
                searchAndSetStyle(
                    'flag',
                    ButtonStyle.Success,
                    rows,
                    ButtonStyle.Danger
                )
                playerInfo.flagging = !playerInfo.flagging;
            } else if (isNaN(parseInt(buttonId))) {
                searchAndSetStyle(playerInfo.lastYButton, ButtonStyle.Primary, rows);//maybe a good idea for if statement
                searchAndSetStyle(buttonId, ButtonStyle.Success, rows);
                playerInfo.y = buttonId.charCodeAt(0)-65;
                playerInfo.lastYButton = buttonId;
            } else {
                searchAndSetStyle(playerInfo.lastXButton, ButtonStyle.Secondary, rows)
                searchAndSetStyle(buttonId, ButtonStyle.Success, rows);
                playerInfo.x = parseInt(buttonId);
                playerInfo.lastXButton = buttonId;
            }
            return playerInfo
        }

        const filter = m => m.author.id === userId && m.content.length <= 3;//A letter and two digits
        playerData[userId].buttonCollector = message.createMessageComponentCollector(
            { componentType: ComponentType.Button, time: 14.5*60_000 }
        );
        playerData[userId].messageCollector = interaction.channel.createMessageCollector({filter, time: 14.5*60_000})
        playerData[userId].messageCollector.on('collect', msg => {
            //figure out x and y based on input
            const content = msg.content.toUpperCase();
            if (msg.deletable) msg.delete();
            let playerInfo = playerData[userId];//not sure if i like this system
            playerInfo.x = ""
            playerInfo.y = content.charCodeAt(0)-65
            if (!isNaN(content[0])) {//if it's a number
                playerInfo.x = content[0]
            }
            if (!isNaN(content[1])) {
                playerInfo.x = playerInfo.x + content[1].toString()
                if (!isNaN(content[2])) {
                    playerInfo.x = playerInfo.x + content[2].toString()
                } else if (content[2]) {
                    playerInfo.y = content.charCodeAt(2)-65
                }
            } else {//single digit, assume letter
                playerInfo.y = content.charCodeAt(1)-65
            }
            playerInfo.x = parseInt(playerInfo.x);
            if (content === "F") {
                buttonSelect(playerInfo, "flag");//well there's a use
                return;
            }
            inputFunction(playerInfo);
        });
        playerData[userId].buttonCollector.on('collect', i => {
            if (i.user.id === userId) {//maybe use filter instead
                i.deferUpdate();

                let playerInfo = playerData[userId];//not sure if i like this system
                buttonSelect(playerInfo, i.customId);//.data?
                inputFunction(playerInfo);
            } else {
                i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
            }
        });

        setTimeout(function() {
            if (playerData[userId].gameEnd===false) {
                endGame("Game timeout! This should only happen after fourteen and a half minutes.");
            }
        }, 14.5*60_000)
    }
}
