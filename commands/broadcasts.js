const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const indexRoot = process.cwd()
const { permissionHierarchy, database, user, password, options } = require(indexRoot+'/config.json');
const admins = permissionHierarchy.admins;
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js');
const listeningChannel = databaseModels.listeningChannel(sequelize, Sequelize.DataTypes)
listeningChannel.sync();
const broadcastCategories = Object.keys(permissionHierarchy.broadcasts);//integrate into SlashCommandBulder pls todo to do
const allbroadcasters = [];
for (const category of broadcastCategories) {
    allbroadcasters.concat(permissionHierarchy.broadcasts[category]);//who cares about repeats?
}

const addNewChannel = async function(listeningChannel, channelId, category) {
    //check if it exists first
    if (
        await listeningChannel.findOne({
            where: {
                channelId: channelId,
                category: category
            }
        })
    ) return;
    listeningChannel.create({
        channelId: channelId,
        category: category
    })//.then(console.log);
}

// const addChoices = function(option) {
//     for (const category of broadcastCategories) {
//         option.addChoice(category, category);
//     }
//     return option;
// }

const makeCategoriesOption = function(option) {
    option.setName('category')
    .setDescription("What category of message to send")
    .setRequired(true);
    for (const category of broadcastCategories) {
        option.addChoices({name: category, value: category});
    }
    return option.addChoices({name: "All", value: "All"});
}

module.exports = {
    guildCommand: true,
    permittedUserIds: allbroadcasters,
	data: new SlashCommandBuilder()
        .setName('broadcasts')//many shared options, could be collapsed into one single command with stringoption action
		.setDescription('Everything broadcasts.')
        //.setDefaultPermission(false)
        //.setDefaultMemberPermissions('0')
        //SUBCOMMANDS "INHERIT" command permissions 
        .addSubcommand(subcommand => 
            subcommand.setName('add')
            .setDescription('Let a broadcasted messages relay to here. It\'s like server announcements.')
            .addStringOption(option =>
                makeCategoriesOption(option)
            )
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('Which channel will broadcasted messages go to?')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('transmit')
            .setDescription('Send a message.')
            .addStringOption(option =>
                makeCategoriesOption(option)//remove all?
            )
            .addStringOption(option =>
                option.setName('message')
                .setDescription('The... message. You know, the one you  want to send?')
                .setRequired(true)
            )
            .addAttachmentOption(option => 
                option.setName('media')
                .setDescription("An optional attachment.")
            )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('remove')
            .setDescription('Removes a channel\'s "listening" ability. No more broadcasts there.')
            .addStringOption(option =>
                makeCategoriesOption(option)
            )
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('Was it the spam? It was the spam, wasn\'t it?')
                .setRequired(true)
            )
        ),
    execute(interaction) {
        //checks here

        const client = interaction.client;
        const clientUserId = client.user.id;
        const channel = interaction.options.getChannel('channel');
        const channelId = channel?.id;
        const category = interaction.options.getString('category');
        
        if (channel && channel.type!==ChannelType.GuildText) {
            //console.log(channel);
            interaction.reply("You have to select a text channel!");
            return;
        }
        switch(interaction.options.getSubcommand()) {
            case 'add':
                let footnote = "";
                
                if (!channel.permissionsFor(clientUserId)?.has(PermissionFlagsBits.SendMessages)) {
                    footnote += "\rNote: ESB does not currently have permission to send a message to that channel. " 
                    + "Broadcasts will not be recieved until that is changed.";
                }
                interaction.reply("Adding *" + category + "* reciever to <#" + channel.id + ">. "+footnote)

                if (category!=="All") {
                    addNewChannel(listeningChannel, channelId, category);
                    return;
                }
                for (const category of broadcastCategories) {
                    addNewChannel(listeningChannel, channelId, category);
                }
                break;
            case 'transmit':
                if (!(
                    admins.includes(interaction.user.id) ||
                    permissionHierarchy.broadcasts[category].includes(interaction.user.id)
                )) {
                    interaction.reply({content: "You're not permitted to broadcast!", ephemeral: true});
                    return;
                } 
                interaction.reply("Sending message");
                let message = interaction.options.getString('message');
                console.log(message);
                const attachment = interaction.options.getAttachment('media');
                message = message + "\n" + (attachment?.url || '')
                listeningChannel.findAll({where:{category: category}}).then(results => {
                    for (const listeningChannelItem of results) {
                        //console.log(listeningChannelItem);
                        try {
                            client.channels.fetch(listeningChannelItem.channelId)
                            .then((channel) => {
                                require('../utils/resolvename')(interaction.user, interaction.member, false, "ymous")
                                .then(({displayName}) => {
                                    channel.send(`[${category}] ${displayName}: ${message}`);
                                })
                        })
                        } catch {
                            console.log("Oops, couldn't fetch/send to channel in broadcast transmission!");
                        }    
                    }
                })
                break;
            case 'remove':
                let categoriesDeleted = interaction.options.getString("category")
                const whereObj = {
                    channelId: channelId
                }
                if (categoriesDeleted!=="All") {
                    whereObj.category = category;
                } else {
                    categoriesDeleted = broadcastCategories.join(', ')
                }
                listeningChannel.destroy({
                    where: whereObj
                }).then( (promise) => {
                    //console.log(promise);
                    interaction.reply("Successfully removed " + categoriesDeleted + " from that channel.")
                })
                break;
            default:
                interaction.relpy("Oh snap, something went wrong!")
                break;
        }
    },
    addNewChannel
}