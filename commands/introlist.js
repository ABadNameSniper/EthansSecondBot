const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const {Page, Menu, sliceIntoChunks } = require('../utils/menuSystem.js');//selection type could be obsolete, consider removing (from source!)
const { EmbedBuilder, ComponentType } = require('discord.js');
const { savedUser } = require('../models');

let embed = new EmbedBuilder()
    .setColor('#771177')
    .setTitle('Intro List')
    .setDescription("Select an Introduction!");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('introlist')
		.setDescription('opens intro menu'),
	async execute(interaction, currentUser) {
        const introSelected = currentUser.introSelected;

        //Move outside the function in case performance is an issue.
        const introFileNames = fs.readdirSync(path.resolve(__dirname, '../assets/audio/intros'));
        //Once it gets more than 25 i will have to manually set to 20 so buttons can fit
        const returnedArray = sliceIntoChunks(introFileNames, 25)
        returnedArray[0].unshift("none");//can't forget an opt-out option!
        let pages = [];
        for (const fileName of returnedArray) {
            pages.push(new Page(embed, fileName, 3))
        }

        let menu = new Menu (pages, 0);//could have dynamic starter page!!
        menu.pages[menu.currentPageNumber].embed.setDescription("Select an introduction! \n Current introduction: " + introSelected);
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
                        savedUser.update({introSelected: i.customId}, {where: {userId: interaction.user.id}});
                }
                menu.pages[menu.currentPageNumber].embed.setDescription("Select an introduction! \n Current introduction: "+i.customId);
                menu.update(i);
            } else {
                i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
            }
        });
        collector.on('end', (collected, reason) => {
            if (reason!=="messageDelete") menu.end(interaction);
            menu = null;
        });
	},
};