const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const { broadcastCategories } = require('../config.json');
const { broadcastChannel } = require('../models');

const addNewChannel = async function(userId, categoryName, channelId) {
    const [newChannel] = await broadcastChannel.findOrCreate({
        where: {
            userId,
            categoryName
        },
        defaults: {
            userId,
            categoryName,
        }
    })
    if (newChannel.listenerIds.includes(channelId)) return true;
    
    newChannel.listenerIds = [...newChannel.listenerIds, channelId];
    await newChannel.save();
    return false;
}

const makeCategoriesOption = function(option) {
    option.setName('category')
    .setDescription("What category of message to send")
    .setRequired(true);
    for (const category of broadcastCategories) {
        option.addChoices({name: category, value: category});
    }
    return option;
}

module.exports = {
    guildCommand: true,
    severityThreshold: 2,
	data: new SlashCommandBuilder()
        .setName('broadcasts')
		.setDescription('Everything broadcasts.')
        .addSubcommand(subcommand => 
            subcommand.setName('add')
            .setDescription('Let a broadcasted messages relay to here. It\'s like server announcements.')
            .addStringOption(makeCategoriesOption)
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('Which channel will broadcasted messages go to?')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('transmit')
            .setDescription('Send a message.')
            .addStringOption(makeCategoriesOption)
            .addStringOption(option =>
                option.setName('message')
                .setDescription('The... message. You know, the one you  want to send?')
            )
            .addAttachmentOption(option => 
                option.setName('media')
                .setDescription("An optional attachment.")
            )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('remove')
            .setDescription('Removes the "listener" from the channel.')
            .addStringOption(makeCategoriesOption)
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('Which text channel to remove it from.')
                .setRequired(true)
            )
        ),
    execute(interaction) {
        const client = interaction.client;
        const channel = interaction.options.getChannel('channel');
        const channelId = channel?.id;
        const category = interaction.options.getString('category');
        const user = interaction.user
        const userId = user.id;
        
        if (
            interaction.options.getSubcommand() !== "transmit" 
            && !channel?.isTextBased()
        ) {
            interaction.reply("You have to select a text channel!");
            return;
        }
        switch(interaction.options.getSubcommand()) {
            case 'add':
                const guild = interaction.guild;
                //permissionsFor wouldn't work for whatever reason
                if (!guild.members.me?.permissionsIn(channel)?.has(PermissionFlagsBits.SendMessages)) {
                    interaction.reply("Assignment failed! ESB doesn't have permission to send messages in that channel.");
                    return;
                }
                if (!channel.permissionsFor(user)?.has(PermissionFlagsBits.SendMessages)) {
                    interaction.reply("Assignment failed! You don't have permission to send messages in that channel.");
                    return;
                }
                addNewChannel(userId, category, channelId).then(alreadyPresent => {
                    if (alreadyPresent){
                        interaction.reply("The selected channel is already listening to that category!");
                    } else {
                        interaction.reply(`Adding *${category}* reciever to <#${channelId}>.`);
                    }
                })
                break;
            case 'transmit':
                if (!broadcastCategories.includes(category)) {
                    interaction.reply({content: "Unrecognized category! This is awkward.", ephemeral: true});
                    return;
                }
                let message = interaction.options.getString('message');
                const attachment = interaction.options.getAttachment('media');
                if (!message && !attachment) {
                    interaction.reply("Well you have to send *something*!");
                    return;
                }
                message = message + "\n" + (attachment?.url || '');
                broadcastChannel.findOne({
                    where: {
                        userId,
                        categoryName: category
                    },
                }).then(broadcastChannelItem => {
                    for (const channelId of broadcastChannelItem.listenerIds) {
                        try {
                            client.channels.fetch(channelId)
                            .then(channel => {
                                if (!channel.permissionsFor(user)?.has(PermissionFlagsBits.SendMessages)) return
                                channel.send({
                                    content: `[${category}] <@${userId}>: ${message}`,
                                    allowedMentions: {parse: []}
                                })
                            });
                        } catch {
                            console.log("Oops, couldn't fetch/send to channel in broadcast transmission!");
                            console.log("Consider removing channel automatically");
                        }    
                    }
                })
                interaction.reply("Sending your broadcast!");
                break;
            case 'remove':
                broadcastChannel.findOne({
                    where: {
                        userId,
                        categoryName: category
                    },
                })
                .then(async selectedChannel => {
                    const listenerIndex = selectedChannel?.listenerIds.indexOf(channelId);
                    //If there's no broadcastChannel OR actual channel in the broadcast channel
                    if (!(listenerIndex + 1)) {
                        interaction.reply(`Couldn't find the *${category}* category in <#${channelId}>.`);
                        return;
                    }
                    const updatedList = [...selectedChannel.listenerIds];
                    updatedList.pop(listenerIndex);
                    selectedChannel.listenerIds = updatedList;
                    await selectedChannel.save();
                    interaction.reply(`Successfully removed the *${category}* category in <#${channelId}>.`);
                });
                break;
            default:
                interaction.relpy("Oh snap, something went wrong!");
                break;
        }
    },
    addNewChannel
}