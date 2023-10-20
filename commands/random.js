const { SlashCommandBuilder } = require('@discordjs/builders');
var min, max;
module.exports = {
	data: new SlashCommandBuilder()
		.setName('random')
		.setDescription('get a random number')
        
        .addNumberOption(option =>
            option.setName("max")
                .setDescription("minimum number")
                .setRequired(false)
        )
        .addNumberOption(option =>
            option.setName("min")
                .setDescription("minimum number")
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName("floatingpoint")
                .setDescription("need something more specific?")
                .setRequired(false)
        )
    ,
	async execute(interaction) {
        const MIN = interaction.options.getNumber('min') || 0;
        const MAX = interaction.options.getNumber('max') || MIN + 1;

        if (interaction.options.getBoolean('floatingpoint')) {
            interaction.reply((Math.random() * (MAX - MIN)     + MIN     ).toString());
        } else { //inclusive, integers
            interaction.reply((Math.random() * (MAX - MIN + 1) + MIN << 0).toString());
        }
    },
};