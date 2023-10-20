const { SlashCommandBuilder } = require('@discordjs/builders');
const indexRoot = process.cwd()
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js')
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
userInfo.sync()

const { Page, Menu } = require(indexRoot+'/utils/menuSystem.js');
const { EmbedBuilder, ComponentType } = require('discord.js');
const embedDescription1 = 
    "Anonymity level "
    + "\n **None** will display your full username in hyperchats"
    + "\n **Server** will display your server display name only"
    + "\n**Anonymous** will make you anonymous to other users"
    + "\n Current Anonymity Level: "
let embed1 = new EmbedBuilder()
    .setColor('#771177')
    .setTitle('Settings')//TODO: make sure I mention PFP when I add pfp support
    .setDescription(
        embedDescription1
    )
module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('opens user settings menu'),
	async execute(interaction) {
        let currentUserInfo = await databaseModels.userInfoDefault(userInfo, interaction.user.id);
        embed1.setDescription(
            embedDescription1 + currentUserInfo.get("settings").anonymizeTag
        )
        let pages = [
            new Page(
                embed1,
                ["None", "Server", "Anonymous"],
                3
            )
        ];
        let menu = new Menu (pages, 0);
        let message = await menu.send(interaction);
        let collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000 });
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
                        //crud, I may have to readd button types to pages...
                        userInfo.update({settings: {anonymizeTag: i.customId}}, {where: {userId: i.user.id}});
                        
                }
                menu.pages[menu.currentPageNumber].embed.setDescription(embedDescription1 + i.customId);
                menu.update(i);
            } else {
                i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
            }
        });
        collector.on('end', (collected, reason) => {
            if (reason!=="messageDelete") menu.end(interaction);
            menu = null;
        });
    }
};