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
minesweeperGame.sync();

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

const numberEmojis = [/*'🟦'*/":tada:", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const topStringOG = [
    "💣", "0️⃣", ...numberEmojis.slice(1),
    " 11 ", " 12 ", " 13 ", " 14 ", " 15 ", " 16 ", " 17 ", " 18 ", " 19 ", " 20 ", " 21 ", " 22 ", " 23 ", " 24 ", " 25 ", "💣","\n"
];
const letterChars = '🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿';

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

const safeSurroundings = function(field, y, x, func) {
    for (       let i = Math.max(y - 1, 0); i < Math.min(y + 2, field   .length);   i++) {
        for (   let j = Math.max(x - 1, 0); j < Math.min(x + 2, field[i].length);   j++) {
            func(i, j);
        }
    }
}

const prepareMessage = function(field, visibleField, topString, additionalMessage, updateGridString) {
    let gameDisplayString = topString;
    for (let i = 0; i < visibleField.length; i++) {
        gameDisplayString += letterChars.substring(i*2, i*2 + 2);
        for (let j = 0; j < visibleField[i].length; j++) {
            gameDisplayString += updateGridString(i, j, field, visibleField, );
        }
        gameDisplayString += letterChars.substring(i*2, i*2 + 2) + "\n";
    }
    return gameDisplayString + topString + additionalMessage;
}

const getGridTile = function(i, j, field, visibleField) {
    return visibleField[i][j] == "flag"
        ? '\uD83D\uDEA9'
        : !visibleField[i][j]
            ? '⬜'
            : numberEmojis[field[i][j]]
}

const difficulties = {
    Easy: {
        width: 4,
        height: 5,
        mines: 4,
        difficulty: "Easy"
    },
    Medium: {
        width: 9,
        height: 10,
        mines: 7,
        difficulty: "Medium"
    },
    Hard: {
        width: 9,
        height: 15,
        mines: 16,
        difficulty: "Hard"
    },
    "Very Hard": {
        width: 12,
        height: 12,
        mines: 24,
        difficulty: "Very Hard"
    },
    "Maximum": {
        width: 26,
        height: 26,
        mines: 150,
        difficulty: "Maximum"
    }
}

const customDisclaimer = "Setting will change difficulty to custom, so you won\'t appear on leaderboards."

module.exports = {
    guildCommand: false,
    severityThreshold: 2,
	data: new SlashCommandBuilder()
		.setName('minesweeper')
		.setDescription('minesweeper gaming')
        //Commands will have to be updated to keep difficulty options accurate!
        .addStringOption(option => 
            option.setName('difficulty')
            .setDescription(
                Object.keys(difficulties).map(
                    key => `${key}: ${difficulties[key].width}x${difficulties[key].height}💣${difficulties[key].mines}`
                ).join(" ")
            )
            .addChoices(
                ...Object.keys(difficulties).map(key => {return {name: key, value: key}})
            )
        )
        .addIntegerOption(option =>
            option.setName("mines")
            .setDescription(`Amount of mines. ${customDisclaimer}`)
            .setMinValue(2)
        )
        .addIntegerOption(option =>
            option.setName("width")
            .setDescription(`Changes grid width. ${customDisclaimer}`)
            .setMinValue(4)
            .setMaxValue(26)
        )
        .addIntegerOption(option =>
            option.setName("height")
            .setDescription(`Changes grid height. ${customDisclaimer}`)
            .setMinValue(4)
            .setMaxValue(26)
        )
        .addBooleanOption(option =>
            option.setName("buttons")
            .setDescription("Include on-screen buttons to tap instead of typing out coordinates. Recommended for mobile devices.")
        ),
	async execute(interaction) {
        const userId = interaction.user.id
        
        const endGame = function(additionalMessage) {
            playerData[userId]?.buttonCollector?.stop();//had an err where buttonCollector didn't exist. Weird.
            playerData[userId]?.messageCollector?.stop();

            gameDisplayString = prepareMessage(field, visibleField, topString, additionalMessage, (i, j) => {
                return field[i][j] === 9
                    ? visibleField[i][j] === true //Explicit true, to exclude flags
                        ? ":boom:"
                        : "💣"
                    : numberEmojis[field[i][j]];
            });

            for (const msgActionRow of rows) {
                for (const component of msgActionRow.components) {
                    component.setDisabled(true);
                }
            }
            playerData[userId].gameEnd = true;
            interaction.editReply(
                {content: gameDisplayString, components: rows}
            );
        }
        //if there's been a previous game and it hasn't been ended
        if (!playerData?.[userId]?.gameEnd) {
            playerData[userId]?.buttonCollector?.stop();//had an err where buttonCollector didn't exist. Weird.
            playerData[userId]?.messageCollector?.stop();
        }

        //These aren't exclusive, so just make sure they're not on desktop or web.
        const includeButtons = 
            interaction.options.getBoolean("buttons") ??
            (!interaction?.member?.presence?.clientStatus.desktop
            && !interaction?.member?.presence?.clientStatus.web)

        playerData[userId] = {
            x: null,
            y: null,
            lastXButton: null,
            lastYButton: null,
            flagging: false,
            gameEnd: false
            //the collectors too
        }

        // let width, height, mines, difficulty;
        const medium = difficulties["Medium"];

        const { width, height, mines, difficulty } = 
            //Check if custom
            interaction.options.getInteger("width")
            || interaction.options.getInteger("height")
            || interaction.options.getInteger("mines")
            ? {
                width: interaction.options.getInteger("width") ?? medium.width,
                height: interaction.options.getInteger("height") ?? medium.height,
                mines: interaction.options.getInteger("mines") ?? medium.mines,
                difficulty: "Custom"
            }
            : difficulties[interaction.options.getString('difficulty')] ?? medium;
        
        if (includeButtons && width + height > 24) {
            //maybe change this up when  I add text input
            interaction.reply(
                "Sorry, Discord isn't meant for minesweeper, so with this control layout I can only add 24 buttons" +
                " + the flag! Try making a smaller grid or setting the `buttons` option to off."
            );
            return;
        } 
        if (mines / (width * height) > 0.4) {
            interaction.reply(
                `Sorry, the maximum mine concentration is 40%, you had ${
                    ((mines / (width * height) * 100).toString()).substring(0, 5)
                }% concentration.`
            );
            return;
        } 

        let rows = [];
        if (includeButtons) {
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
                    .setCustomId(String.fromCharCode(i + 64 - width))
                    .setLabel(String.fromCharCode(i + 64 - width))
                    .setStyle(ButtonStyle.Primary)
                );
                if ((i + 1) % 5 === 0 || i === height + width) {
                    rows.push(currentMAR)
                    currentMAR = new ActionRowBuilder()
                }
            }
        } 
        const topString = topStringOG.slice(0, width + 1).join('')+'💣\n';
        let flagsAmount = 0;
        let squaresDug = 0;
        let winState;
        let gameOver = false;
        const field = Array(height);
        const visibleField = Array(height);
        for (let i = 0; i < field.length; i++) {
            field[i] = Array(width);
            visibleField[i] = Array(width);
            for (let j = 0; j < field[i].length; j++) {
                field[i][j] = 0;
                visibleField[i][j] = false;
            }
        }
        
        const dig = function(y, x) {
            visibleField[y][x] = true;
            //Clicked on a mine!
            if (field[y][x] === 9) {
                winState = false;
                gameOver = true;
            } else {
                squaresDug ++;
                if (field[y][x] === 0) {
                    safeSurroundings(field, y, x, (i, j) => {
                        if (!visibleField[i][j]) dig(i, j);
                    })
                }
                if (squaresDug === height * width - mines) {
                    //win
                    winState = true;
                    gameOver = true;
                }
            }
        }

        let gameDisplayString = prepareMessage(field, 
            visibleField, 
            topString, 
            `\nDifficulty: ${difficulty} | Total Mines: ${mines} | Mines Left: ${mines - flagsAmount}`,
            getGridTile
        )

        const message = await interaction.reply({
            content: gameDisplayString,
            components: rows,
            fetchReply: true
        })
        
        let initialClickTime;
        let firstGuess = true;
        const inputFunction = function(playerInfo) {
            const { x, y, flagging} = playerInfo

            if (
                x == null || y == null || //Check if nullish
                isNaN(x) || isNaN(y) || //Check if not a number
                x < 0 || y < 0 || x >= width || y >= height //check if out of bounds
            ) return;

            searchAndSetStyle(playerInfo.lastYButton, ButtonStyle.Primary, rows);
            searchAndSetStyle(playerInfo.lastXButton, ButtonStyle.Secondary, rows);
            
            delete playerInfo.lastXButton;
            delete playerInfo.lastYButton;

            initialClickTime ??= Date.now();

            if (flagging) {
                //flagging and unflagging
                if (!visibleField[y][x]) {
                    visibleField[y][x] = "flag";
                    flagsAmount++;
                } else if (visibleField[y][x] === "flag") {
                    visibleField[y][x] = false;
                    flagsAmount--;
                }
            } else if (!visibleField[y][x]) {
                //digging
                if (firstGuess) {
                    firstGuess = false;
                    //Generate the board. If a bad mine is placed, try again
                    //Should be fine to repeat a few times, since the maximum concentration is 40%
                    for (let i = 0; i < mines; i++) {
                        const mineX = Math.floor(Math.random() * width);
                        const mineY = Math.floor(Math.random() * height);
                        if (
                            field[mineY][mineX] !== 9
                            && (//Making sure new random mine is far enough from the player's selection
                                    Math.abs(y-mineY) > 1
                                ||  Math.abs(x-mineX) > 1
                            )
                        ) {
                            field[mineY][mineX] = 9;
                            safeSurroundings(field, mineY, mineX, (i, j) => {
                                if (field[i][j] !==9) field[i][j]++;
                            })
                        } else {
                            i--;
                        }
                    }
                }
                dig(y, x);
            } else {
                //chording
                //check for nearby flags
                let flagsAround = 0;
                safeSurroundings(visibleField, y, x, (i, j) => {
                    if (visibleField[i][j] === "flag") flagsAround++;
                })
                //if exact number, dig in all new, valid spaces
                if (flagsAround === field[y][x]) {
                    safeSurroundings(visibleField, y, x, (i, j) => {
                        if (!visibleField[i][j]) dig(i, j);
                    })
                }
                
            }

            gameDisplayString = prepareMessage(field, 
                visibleField, 
                topString,
                `\nDifficulty: ${difficulty} |` 
                + `Total Mines: ${mines} | `
                + `Mines Left: ${mines-flagsAmount} | `
                + `Time: ${(Date.now() - initialClickTime)/1000}s`,
                getGridTile
            )

            delete playerInfo.x;
            delete playerInfo.y;
            if (gameOver) {
                if (winState) {
                    const msTime = Date.now() - initialClickTime;
                    endGame(`\nDifficulty: ${difficulty} | ${mines} mines complete in ${msTime/1000} seconds!`);
                    if (difficulty === "Custom") return;
                    minesweeperGame.create({
                        userInfoUserId: userId,
                        serverInfoServerId: interaction?.guild?.id || globalAndTestGuildId,
                        difficulty: difficulty,
                        time: msTime,
                    });
                } else {
                    let correctFlags = 0;
                    let incorrectFlags = 0;
                    for (let i = 0; i < visibleField.length; i++) {
                        for (let j = 0; j < visibleField[i].length; j++) {
                            if (visibleField[i][j] === "flag" && field[i][j] === 9) {
                                correctFlags++;
                            } else if (visibleField[i][j] === "flag") {
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
            }
            

            playerData[userId] = playerInfo;

            interaction.editReply(
                {content: gameDisplayString, components: rows}
            );
        }
        

        const filter = m => m.author.id === userId && m.content.length <= 3;//A letter and two digits
        playerData[userId].messageCollector = interaction.channel.createMessageCollector({filter, time: 14.5*60_000});
        playerData[userId].messageCollector.on('collect', msg => {
            //figure out x and y based on text input
            const content = msg.content.toUpperCase();
            if (!content) return;
            if (msg.deletable) msg.delete();
            let playerInfo = playerData[userId];
            if (content === "F") {
                playerInfo.flagging = !playerInfo.flagging;
                if (includeButtons) buttonSelect(playerInfo, "flag");
                return;
            }
            const first = content[0];
            const second = content[1];
            const third = content[2];
            playerInfo.x = "";
            playerInfo.y = first.charCodeAt(0) - 65;
            if (!isNaN(first)) {//if it's a number
                playerInfo.x = first;
            }
            if (!isNaN(second)) {
                playerInfo.x = playerInfo.x + second.toString();
                if (!isNaN(third)) {
                    playerInfo.x = playerInfo.x + third.toString();
                } else if (third) {
                    playerInfo.y = third.charCodeAt(0) - 65;
                }
            } else if (second) {//single digit, assume letter
                playerInfo.y = second.charCodeAt(0) - 65;
            }
            playerInfo.x = parseInt(playerInfo.x);
            inputFunction(playerInfo);
        });
        

        setTimeout(function() {
            if (!playerData[userId].gameEnd) {
                endGame("Game timeout! This should only happen after fourteen and a half minutes.");
            }
        }, 14.5*60_000)

        if (!includeButtons) return;
        //wait a second i really only need this for the buttons... otherwise... yeah...

        //TODO: change this into more of a display type thing.
        const buttonSelect = function(playerInfo, buttonId) {
            if (buttonId === 'flag') {
                searchAndSetStyle(
                    'flag',
                    ButtonStyle.Success,
                    rows,
                    ButtonStyle.Danger
                )
                //playerInfo.flagging = !playerInfo.flagging;
            } else if (isNaN(parseInt(buttonId))) {
                searchAndSetStyle(playerInfo.lastYButton, ButtonStyle.Primary, rows);//maybe a good idea for if statement
                searchAndSetStyle(buttonId, ButtonStyle.Success, rows);
                playerInfo.y = buttonId.charCodeAt(0) - 65;
                playerInfo.lastYButton = buttonId;
            } else {
                searchAndSetStyle(playerInfo.lastXButton, ButtonStyle.Secondary, rows)
                searchAndSetStyle(buttonId, ButtonStyle.Success, rows);
                playerInfo.x = parseInt(buttonId);
                playerInfo.lastXButton = buttonId;
            }
            return playerInfo
        }
        playerData[userId].buttonCollector = message.createMessageComponentCollector(
            { componentType: ComponentType.Button, time: 14.5*60_000 }
        );
        playerData[userId].buttonCollector.on('collect', i => {
            if (i.user.id === userId) {
                i.deferUpdate();

                let playerInfo = playerData[userId];//not sure if i like this system
                buttonSelect(playerInfo, i.customId);//.data?
                inputFunction(playerInfo);
            } else {
                i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
            }
        });
    }
}
