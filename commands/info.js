const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ComponentType } = require('discord.js');
const fs = require('fs');
const { Page, Menu } = require('../utils/menuSystem');

const tosText = fs.readFileSync('botTOS.txt', 'utf8', (err,data) => {});
const privacyPolicy = fs.readFileSync('botPrivacyPolicy.txt', 'utf8', (err,data) => {});

const credits = [
    "200Ethan",
    "Dragonhelm",
    "Qnce",
    "toxicshade",
    "@lifc",
    "hoodieturtle",
    "zoox",
    "Jerry",
    "User454",
    "Threeshotsfired",
    "Aidenzilla"
];

let devTests='';
for (i = 3; i < credits.length; i++) {
    devTests+="• "+credits[i]+"\r"
}

let menu = new Menu(//i'd love to redefine up there
    [
        new Page(
            new EmbedBuilder()
            .setColor('#771177')
            .setTitle('Bot Information (1/5)')
            .setDescription(
                "**Ethan's Second Bot**\n" +
                "It's another fun project, brought to you by -- well I'm sure you can guess.\r"+
                "I don't know why I made/am making it. Maybe to procrastinate doing other stuff? That's what I'm doing right now, at least. It does fun stuff, just go through the commands.\r"+
                `Made by ${credits[0]} \r`+
                `Huge, massive, gigantic, other words for "big" thanks to ${credits[1]} for the PFP!!\r` +
                `Thanks ${credits[3]} for the intros idea (or at least sparking it) all those many, many months ago \r`+
                `Thanks ${credits[2]} for the idea for the @me trigger word (and for being Qnce) \r` +
                `Here are a few development testers: \r`+
                devTests + '\r' +
                `and ${credits[4]} for a particularly meaningful amount of feedback.`
            ),
            undefined,
            1
        ),
        new Page(
            new EmbedBuilder()
            .setColor('#600B8A')
            .setTitle('Command Help (2/5)')
            .setDescription(
                "The commands are pretty self explanatory for the most part, and with slash commands I can put descriptions for all the options. Despite this, some commands could use further explanation.\n"+
                "**Server Owners**\r" +
                "You have a lot of things you can do. You can enable and disable a lot of this bot's functionality when you use /serversettings\r"+
                "The /blacklist command is used to restrict a user's ability to use ESB. Note that ESB is not a moderation bot, so go add Dyno or something if you need that.\r"+
                "While in development, these are subject to change, and I may even drop the blacklist database from time to time, but for now:\r"+
                "1: Can't use @someone or privately join a hyperchat.\r"+
                "2: The above and can't use minesweeper nor toggle a hyperchat nor use intros.\r"+//Consider changing intros to 3
                "3: The above and can't speak in hyperchat nor toggle trigger words.\r"+
                "4: Cannot interact with Ethan's Second Bot.\n"+
                "**Other Information**\r"+ 
                "Sometimes messages just don't embed when sent through a hyperchannel. Blame internet speeds or Discord or something.\r"+
                "You can ditch the minesweeper buttons and just type 'a1' or '5G' or whatever. Type a single 'f' to toggle flagging."
            )
        ),
        new Page(
            new EmbedBuilder()
            .setColor('#420420')
            .setTitle('TOS (3/5)')
            .setDescription(
                tosText
            )
        ),
        new Page(
            new EmbedBuilder()
            .setColor('#420420')
            .setTitle('Privacy Policy (4/5)')
            .setDescription(
                privacyPolicy
            )
        ),
        new Page(
            new EmbedBuilder()
            .setColor('#696969')
            .setTitle("We're no strangers to love (5/5)")
            .setDescription(
                "You know the rules and so do I \n" +
                "Sorry, I had to 'roll ya."
            ).setURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
            .setFooter({text: "I am incredibly funny"}),
            undefined,
            2
        )
    ],
    0//one day.../
);



module.exports = {
    guildCommand: false,
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Bot help, information, credits, etc.'),
	async execute(interaction) {
        //console.log(menu);
        const message = await menu.send(interaction);//switcch to .then
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 120_000 });
        collector.on('collect', i => {
            if (i.user.id === interaction.user.id) {
                switch(i.customId) {
                    case "first":
                        menu.currentPageNumber = 0;
                        break;
                    case "previous":
                        menu.currentPageNumber--;
                        break;
                    case "next":
                        menu.currentPageNumber++;
                        break;
                    case "last":
                        menu.currentPageNumber = menu.pages.length-1;
                        break;
                    default:
                        
                }
            menu.update(i);
            } else {
                i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
            }
        });
        collector.on('end', (collected, reason) => {
            if (reason!=="messageDelete") menu.end(interaction);
            //menu = null;
        });
    }
}