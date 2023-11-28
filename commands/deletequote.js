const { SlashCommandBuilder } = require('@discordjs/builders');

const { globalAndTestGuildId} = require('../config.json');
const { quote } = require('../models');

module.exports = {
    guildCommand: true,
    guildWhitelist: [globalAndTestGuildId],
	data: new SlashCommandBuilder()
    .setName('deletequote')
    .setDescription('deletes a quote')
    .addNumberOption(option =>
        option.setName('id')
        .setDescription('yes')
        .setRequired(true)
    ),
    execute(interaction) {
        quote.destroy({
            where:{
                id: interaction.options.getNumber('id')
            }
        })
    }
}