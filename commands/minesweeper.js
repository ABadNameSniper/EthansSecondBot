const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder,  ButtonStyle, ComponentType } = require('discord.js');
const { globalAndTestGuildId } = require('../config.json');
const { minesweeperGame } = require('../models');
var playerData = {};

const explosion = "💥";
const bomb = "💣";
const numberEmojis = ["🟦", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "‼"];
const maximumLength = 26;
const maximumDensity = 0.25;
const maximumMines = Math.floor(maximumLength ** 2 * maximumDensity);
const largeModeThreshold = 199;//Discord does not display 200 or more emojis in a single message.
const timeLimit = 14.9*60_000;

const formats = {
    normal: {
        letterChars: '🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿',
        topString: [
            bomb, "0️⃣", ...numberEmojis.slice(1),
            ...[...Array(maximumLength - numberEmojis.length).keys()].map((n) => 
                " " + (n + 11).toString() + " "
            ),
            bomb, "\n"
        ],
        flag: "🚩"
    },
    large: {
        letterChars:
            [...Array(maximumLength).keys()].map((n) => String.fromCharCode(97 + n) + " ").join(""),
        topString : [
            bomb, ...[...Array(maximumLength).keys()].map((n) =>
                n + " ".repeat(n % 2 + (n < 10))//Have to deal with weird spacing in codeblocks!
            ), bomb
        ],
        flag: "⛳"
    }
}

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

const difficulties = {
    "Easy": {
        width: 4,
        height: 5,
        mines: 4,
        difficulty: "Easy"
    },
    "Medium": {
        width: 9,
        height: 10,
        mines: 7,
        difficulty: "Medium"
    },
    "Hard": {
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
        width: maximumLength,
        height: maximumLength,
        mines: maximumMines,
        difficulty: "Maximum",
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
                "Set the difficulty of the grid. Higher difficulties increase in both size and density of mines."
            )
            .addChoices(
                //Neatly organize all of the difficulties, adding some padding to make reading grid size easy.
                ...Object.keys(difficulties).map(key => {return {
                    name: `\`${key}: ${
                        difficulties[key].width
                    }x${
                        difficulties[key].height
                    }💣${
                        difficulties[key].mines
                    }\``, 
                    value: key
                }})
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
            .setMaxValue(maximumLength)
        )
        .addIntegerOption(option =>
            option.setName("height")
            .setDescription(`Changes grid height. ${customDisclaimer}`)
            .setMinValue(4)
            .setMaxValue(maximumLength)
        )
        .addBooleanOption(option =>
            option.setName("buttons")
            .setDescription("Include on-screen buttons to tap instead of typing out coordinates. Recommended for mobile devices.")
        ),
	async execute(interaction) {
        const userId = interaction.user.id
        
        if (playerData[userId]) {
            playerData[userId]?.buttonCollector?.stop("new game");
            playerData[userId].messageCollector.stop("new game");
        }

        playerData[userId] = {};
        const player = playerData[userId]

        const endGame = function(additionalMessage) {
            player?.buttonCollector?.stop("game end");
            player.messageCollector.stop("game end");

            gameDisplayString = prepareMessage((i, j) => {
                return field[i][j] === 9
                    ? visibleField[i][j] === true //Explicit true, to exclude flags
                        ? explosion
                        : bomb
                    : numberEmojis[field[i][j]];
            });

            for (const msgActionRow of rows) {
                for (const component of msgActionRow.components) {
                    component.setDisabled(true);
                }
            }
            interaction.editReply(gameDisplayString);

            statsMessage.edit({
                content: additionalMessage,
                components: rows
            })

            delete playerData[userId];
        }

        const prepareMessage = function(updateGridString) {
            let gameDisplayString = (largeMode && "```" || "") + topStringFit;
            for (let i = 0; i < visibleField.length; i++) {
                gameDisplayString += 
                    letterChars.substring(i*2, i*2 + 2);
                for (let j = 0; j < visibleField[i].length; j++) {
                    gameDisplayString += updateGridString(i, j);
                }
                gameDisplayString += //Trim to save an extra character for later.
                    letterChars.substring(i*2, i*2 + 2).trim() + "\n";
            }
            gameDisplayString += topStringFit + (largeMode && "```\n" || "");
            //Cut off the last little bit, since in 25x25 and larger games the grid can exceed 2k characters.
            if (gameDisplayString.length > 2000) gameDisplayString = gameDisplayString.slice(0, 1997) + "```";
            return gameDisplayString;
        }

        const getGridTile = function(i, j) {
            return visibleField[i][j] == "flag"
                ? flag
                : !visibleField[i][j]
                    ? '⬜'
                    : numberEmojis[field[i][j]]
        }

        //These aren't exclusive, so just make sure they're not on desktop or web.
        const includeButtons = 
            interaction.options.getBoolean("buttons") ??
            (!interaction?.member?.presence?.clientStatus.desktop
            && !interaction?.member?.presence?.clientStatus.web)


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
        
        const largeMode = (width + 2) * (height + 2) > largeModeThreshold;

        if (includeButtons && width + height > 24) {
            //maybe change this up when  I add text input
            interaction.reply(
                "Sorry, Discord isn't meant for minesweeper, so with this control layout I can only add 24 buttons" +
                " + the flag! Try making a smaller grid or setting the `buttons` option to off if you're on mobile."
            );
            return;
        } 
        if (mines / (width * height) > maximumDensity) {
            interaction.reply(
                `Sorry, the maximum mine concentration is ${maximumDensity * 100}%, you had ${
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

            for (i; i - 1 < width; i++) {
                currentMAR.addComponents(
                    new ButtonBuilder()
                    .setCustomId((i - 1).toString())
                    .setLabel((i - 1).toString())
                    .setStyle(ButtonStyle.Secondary)
                );
                if ((i + 1) % 5 === 0) {
                    rows.push(currentMAR);
                    currentMAR = new ActionRowBuilder();
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
                    rows.push(currentMAR);
                    currentMAR = new ActionRowBuilder();
                }
            }
        }

        const {topString, letterChars, flag} = formats[largeMode && "large" || "normal"];
        const topStringFit = topString.slice(0, width + 1).join('') + bomb + "\n";

        let flagsAmount = 0;
        let squaresDug = 0;
        let correctFlags = 0;
        let incorrectFlags = 0;
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
                    + `Time: ${((Date.now()-initialClickTime)/1000).toFixed(3)} | `
                    + `Correct Flags: ${correctFlags} | `
                    + `Incorrect Flags: ${incorrectFlags}`
                );
            } else {
                squaresDug ++;
                if (field[y][x] === 0) {
                    safeSurroundings(field, y, x, (i, j) => {
                        if (!visibleField[i][j]) dig(i, j);
                    })
                }
            }
        }

        let gameDisplayString = prepareMessage(getGridTile);

        await interaction.reply(gameDisplayString);

        const statsMessage = await interaction.channel.send({
            content: `\nDifficulty: ${difficulty} | Total Mines: ${mines} | Mines Left: ${mines - flagsAmount}`,
            components: rows,
            fetchReply: true
        })

        const updateStatsMessage = function() {
            return `\nDifficulty: ${difficulty} |` 
                + `Total Mines: ${mines} | `
                + `Mines Left: ${mines-flagsAmount} | `
                + `Time: ${((Date.now()-initialClickTime)/1000).toFixed(3)}s`
        }
        
        let initialClickTime;
        let firstGuess = true;
        const inputFunction = function() {
            const { x, y } = player;

            initialClickTime ??= Date.now();

            if (player.flagging) {
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
                    //Should be fine to repeat a few times, since the maximum concentration is 33%
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
            if (squaresDug === height * width - mines) {
                //win
                const msTime = Date.now() - initialClickTime;
                endGame(`\nDifficulty: ${difficulty} | ${mines} mines complete in ${(msTime/1000).toFixed(3)} seconds!`);
                if (difficulty === "Custom") return;
                minesweeperGame.create({
                    userId,
                    guildId: interaction?.guild?.id || globalAndTestGuildId,
                    difficulty: difficulty,
                    time: msTime,
                });
            }

            //Check if user was removed from playerData via the endGame function
            if (!playerData[userId]) return

            gameDisplayString = prepareMessage(getGridTile);

            delete player.x;
            delete player.y;
            player.flagging = false;

            interaction.editReply(gameDisplayString);

            statsMessage.edit({
                content: updateStatsMessage(),
                components: rows
            });
        }

        player.messageCollector = interaction.channel.createMessageCollector({
            filter: m => 
                m.author.id === userId
                && m.content.length
                && m.content.length <= 4 , 
            time: timeLimit
        });
        
        player.messageCollector.on('collect', msg => {
            //this is written assuming a height of 26 for 26 letters.
            const content = msg.content.toUpperCase();
            const numbers = content.match(/\d{1,2}/g);
            if (!numbers?.length || numbers.length > 1) return;
            player.x = parseInt(numbers[0]);
            const letters = content.match(/[A-Z]/g);
            if (!letters?.length || letters.length > 2) return;
            if (letters.length > 1) {
                player.flagging = true;
                if (letters[0] === "F") {
                    //Flag
                    player.y = letters[1].charCodeAt(0) - 65;
                } else if (letters[1] === "F") {
                    //Flag
                    player.y = letters[0].charCodeAt(0) - 65;
                } else {
                    //Invalid with 26 letters
                    player.flagging = false;
                    return;
                }
            } else {
                player.y = letters[0].charCodeAt(0) - 65;
            }
            if (player.x >= width || player.y >= height) return;
            if (msg.deletable) msg.delete();
            inputFunction();
        });
        playerData[userId].messageCollector.on('end', (_collected, reason) => {
            if (reason === "game end") return;
            endGame(
            `\nGame ended due to ${reason}.`
            + `\nDifficulty: ${difficulty} | `
            + `Spaces Dug: ${squaresDug ?? 0} | ` 
            + `Time: ${((Date.now()-initialClickTime)/1000).toFixed(3)} | `
            + `Correct Flags: ${correctFlags ?? 0} | `
            + `Incorrect Flags: ${incorrectFlags ?? 0}`
            );
        });

        if (!includeButtons) return;
        //wait a second i really only need this for the buttons... otherwise... yeah...

        playerData[userId].buttonCollector = statsMessage.createMessageComponentCollector(
            { componentType: ComponentType.Button, time: timeLimit }
        );
        playerData[userId].buttonCollector.on('collect', i => {
            if (i.user.id === userId) {
                i.deferUpdate();
                const buttonId = i.customId;
                if (buttonId === "flag") {
                    player.flagging = !player.flagging;
                    searchAndSetStyle("flag", ButtonStyle.Success, rows, ButtonStyle.Danger);
                } else if (isNaN(parseInt(buttonId))) {//If it's a letter
                    searchAndSetStyle(player.lastYButton, ButtonStyle.Primary, rows);//maybe a good idea for if statement
                    searchAndSetStyle(buttonId, ButtonStyle.Success, rows);
                    player.y = buttonId.charCodeAt(0) - 65;
                    player.lastYButton = buttonId;
                } else {
                    searchAndSetStyle(player.lastXButton, ButtonStyle.Secondary, rows);
                    searchAndSetStyle(buttonId, ButtonStyle.Success, rows);
                    player.x = parseInt(buttonId);
                    player.lastXButton = buttonId;
                }
                if (player.lastXButton && player.lastYButton) {
                    searchAndSetStyle(player.lastYButton, ButtonStyle.Primary, rows);
                    searchAndSetStyle(player.lastXButton, ButtonStyle.Secondary, rows);
                    searchAndSetStyle("flag", ButtonStyle.Danger, rows)

                    delete player.lastXButton
                    delete player.lastYButton

                    inputFunction();
                } else {
                    statsMessage.edit({
                        content: updateStatsMessage(),
                        components: rows
                    })
                }
            } else {
                i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
            }
        });
    }
}
