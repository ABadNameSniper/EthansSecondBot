const { SlashCommandBuilder } = require('@discordjs/builders');
const { Page, Menu } = require('../utils/menuSystem.js');
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
	async execute(interaction, currentUser) {
        embed1.setDescription(
            embedDescription1 + currentUser.settings.anonymizeTag
        )
        let pages = [
            new Page(
                embed1,
                ["None", "Server", "Anonymous"],
                3
            )
        ];
        let menu = new Menu (pages, currentUser.settingsPage);
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
                        currentUser.update({settings: {anonymizeTag: i.customId}});
                }
                menu.pages[menu.currentPageNumber].embed.setDescription(embedDescription1 + i.customId);
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
};