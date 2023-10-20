const { SlashCommandBuilder } = require('@discordjs/builders');
const indexRoot = process.cwd()
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js')
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes)
serverInfo.sync()

const { Page, Menu, sliceIntoChunks } = require(indexRoot+'/utils/menuSystem.js');

const { EmbedBuilder, ComponentType, ButtonStyle } = require('discord.js');
let embed1 = new EmbedBuilder()
    .setColor('#771177')
    .setTitle('Server Settings')
    .setDescription("Page 1. Toggle settings off and on here.")
module.exports = {
    guildCommand: true,
	data: new SlashCommandBuilder()
		.setName('serversettings')
		.setDescription('opens server serverSettings menu')
        .setDefaultMemberPermissions('0'),
	async execute(interaction) {
        currentServerInfo = await databaseModels.serverInfoDefault(serverInfo, interaction.guild.id);
        if (!currentServerInfo) throw new Error("Somehow a server wasn't found");
        let currentServerSettings = currentServerInfo.get("serverSettings");
        //TODO: change to 20 when exceeds 25
        let currentServerSettingsKeyArray = sliceIntoChunks(Object.keys(currentServerSettings), 25);
        let pages = [];
        let buttonTypeArray = []
        for (const buttonType of currentServerSettingsKeyArray[0]) {
            buttonTypeArray.push(
                buttonType
                ? ButtonStyle.Success 
                : ButtonStyle.Danger
            );
        }

        pages.push(new Page(
            embed1,
            currentServerSettingsKeyArray[0],//i love only half future proofing
            3,
            buttonTypeArray
        ));
        let menu = new Menu (pages, 0);//change from 0 to serverSettingsPage later
        const message = await menu.send(interaction);
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });
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
                        currentServerSettings[i.customId] = !currentServerSettings[i.customId];
                        serverInfo.update({serverSettings: currentServerSettings}, {where:{serverId: interaction.guild.id}})

                        for (let msgActionRow of menu.pages[menu.currentPageNumber].rows) {
                            for (let component of msgActionRow.components) {
                                if (component.data.custom_id === i.customId) {
                                    component.setStyle(
                                        component.data.style === ButtonStyle.Success 
                                        ? ButtonStyle.Danger 
                                        : ButtonStyle.Success
                                    );//flip the style
                                }
                            }
                        }
                }
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
}