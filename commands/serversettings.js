const { SlashCommandBuilder } = require('@discordjs/builders');

const { Page, Menu, sliceIntoChunks } = require('../utils/menuSystem.js');

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
	async execute(interaction, _currentUser, currentGuild) {
        let serverSettingsPage = currentGuild.serverSettingsPage;
        //TODO: change to 20 when exceeds 25
        let currentServerSettingsKeyArray = sliceIntoChunks(Object.keys(currentGuild.serverSettings), 25);
        let pages = [];
        let buttonTypeArray = []
        for (const setting of currentServerSettingsKeyArray[0]) {
            buttonTypeArray.push(
                currentGuild.serverSettings[setting]
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
        let menu = new Menu (pages, serverSettingsPage);
        const message = await menu.send(interaction);
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });
        collector.on('collect', async i => {
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
                        const updatedSettings = {...currentGuild.serverSettings};
                        updatedSettings[i.customId] = !updatedSettings[i.customId]
                        await currentGuild.update({serverSettings: updatedSettings});

                        for (const msgActionRow of menu.pages[menu.currentPageNumber].rows) {
                            for (const component of msgActionRow.components) {
                                if (component.data.custom_id === i.customId) {
                                    component.setStyle(
                                        component.data.style === ButtonStyle.Success 
                                        ? ButtonStyle.Danger 
                                        : ButtonStyle.Success
                                    );//flip the style
                                    break;
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
            if (reason !== "messageDelete") menu.end(interaction);
            menu = null;
        });
    }
}