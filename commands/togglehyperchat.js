const { SlashCommandBuilder } = require('@discordjs/builders');
const indexRoot = process.cwd()
const { globalAndTestGuildId, clientId, database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js')
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes)
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes)
const blacklistItem = databaseModels.blacklistItem(sequelize, Sequelize.DataTypes);
userInfo.hasMany(blacklistItem, {sourceKey: 'userId'});
blacklistItem.belongsTo(userInfo, {targetKey: 'userId'});
userInfo.sync();
serverInfo.sync();
blacklistItem.sync();
const resolveName = require('./../utils/resolvename');
const { EmbedBuilder, MessageType, ActivityType } = require('discord.js');

const messageUpdate = require('./../events/messageUpdate').emitter;
const messageDelete = require('./../events/messageDelete').emitter;

//so basically these three things behave similarly enough
const embeddablesCollectionMetaTypes = ['embeds', 'attachments', 'stickers'];

const textChannels = {
	/*
	'1243798753': {
		channel: 
		id: '1243798753',
		hyperChannelId: '1', //necessary because the hyperchannels are arrays of textChannel objects and cannot store their own ID
		hyperChannel: hyperChannel
		collector: collector,
		privateConnection: false,
		hyperMessageCache = {
			"38923482394": [Message, Message]
		}
	}
	*/

}
const hyperChannels = {
/*
	'123456' : [textChannel, textChannel]
	'789101' : [textChannel]
*/
}

const anonymousCache = [];

const fullyResolveName = async function(user, member) {
	var anonId = anonymousCache.findIndex(element => element === (user||member).id);
	if (anonId === -1) anonId = anonymousCache.push(user.id) - 1;
	return await resolveName(
		user,
		member, 
		anonId
	);
}

//embeds, stickers, videos
const getUniqueEmbeddables = function(newEmbeddablesCollection, oldEmbeddablesCollection) {
	let uniqueEmbeddables = [];
	let commonEmbeddables = [];//less recalculating.
	if (!newEmbeddablesCollection) return [[], []];//end if empty
	for (const newEmbeddable of newEmbeddablesCollection) {
		//gets all truly new embeds
		const newEmbeddableData = newEmbeddable.data || newEmbeddable[1];//just the way attachments and stickers are formatted
		const newEmbeddableURL = newEmbeddableData.url || newEmbeddableData.attachment;
		const newEmbeddableType = newEmbeddableData.type || newEmbeddableData.contentType || 'sticker';

		uniqueEmbeddables.push({'url':newEmbeddableURL, 'type':newEmbeddableType});
		if (!oldEmbeddablesCollection) continue;
		for (const oldEmbeddable of oldEmbeddablesCollection) {
			const oldEmbeddableData = oldEmbeddable.data || oldEmbeddable[1];
			const oldEmbeddableURL = oldEmbeddableData.url || oldEmbeddableData.attachment;
			const oldEmbeddableType = oldEmbeddableData.type || oldEmbeddableData.contentType || 'sticker';
			if (oldEmbeddableURL === newEmbeddableURL) {
				uniqueEmbeddables.pop();
				commonEmbeddables.push({'url':oldEmbeddableURL, 'type':oldEmbeddableType});
				break;
			}
		}
	}
	return [uniqueEmbeddables, commonEmbeddables];
}

const updateMessage = async function(oldmsg, newmsg) {
	if (oldmsg?.author?.bot) return

	const oldTextChannel = textChannels[oldmsg.channelId];

	if (!oldTextChannel) return;

	const messageReceipt = oldTextChannel.hyperMessageCache[oldmsg.id];

	if (!messageReceipt) return;

	const hyperChannel = oldTextChannel.hyperChannel

	let allNewEmbeddables = [], allCommonEmbeddables = [], allOldEmbeddables = [];
	for (const type of embeddablesCollectionMetaTypes) {
		const [newEmbeddables, commonEmbeddables] = getUniqueEmbeddables(
			newmsg?.[type], oldmsg[type]
		);
		allCommonEmbeddables = allCommonEmbeddables.concat(commonEmbeddables);
		allNewEmbeddables = allNewEmbeddables.concat(newEmbeddables);
	}
	for (const type of embeddablesCollectionMetaTypes) {
		const [oldEmbeddables, commonEmbeddables] = getUniqueEmbeddables(
			oldmsg[type], allCommonEmbeddables
		);
		//check uniquely old
		allOldEmbeddables = allOldEmbeddables.concat(oldEmbeddables);
	}

	if (!newmsg) delete oldTextChannel.hyperMessageCache[oldmsg.id]; 

	for (let message of messageReceipt) {
		//Check if the channel left the hyperchannel
		if (!textChannels[message.channelId].hyperChannel === hyperChannel) return; 
		
		if (message.embeds?.[0].data?.type === "rich") {
			//the ONLY embed since it's a normal hyperchat rich embed

			//get the fresh message in case it's been added on to
			message = await message.fetch()
			const editEmbed = message.embeds?.[0];
			const desc = editEmbed.data.description;
			const newContentIndex = editEmbed.data.description.indexOf(oldmsg?.content);
			let newDescription = 
				desc.slice(0, newContentIndex) + 
				(newmsg?.content || "") + 
				//newDescription has to be set this way instead of .replace so I can take any possible newlines out.
				desc.slice(newContentIndex + oldmsg?.content.length).trim()
				//After review, I'm not sure what this replace is for
				.replace(/\\/g, '/'); 

			//Simply deleting the hyperchat if the original was deleted and there weren't merged messages.
			if (!newDescription.length) {
				message.delete();
				return;
			}
			
			//Reply to rich text with list of URLs for Discord to automatically embed
			allURLs = allNewEmbeddables.map(newEmbeddable => {
				newDescription = newDescription.replace(
					new RegExp(newEmbeddable.url, 'g'),` [${newEmbeddable.type}]`
				);
				return newEmbeddable.url;
			});
			editEmbed.data.description = (
				newDescription
			);
			message.edit({
				embeds: [editEmbed]
			});
			if (allURLs.length) message.reply(allURLs.join("\n"));
	
		} else {
			//This is for normal embeds within messages that reply to those rich embed messages

			let newcontent = message.content;

			for (const oldEmbeddable of allOldEmbeddables) {
				newcontent = newcontent.replace(oldEmbeddable.url, `[deleted ${oldEmbeddable.type}]`)
			}

			//only edit content, embeds come automagically
			if (!newcontent.length) {
				message.delete();
				return;
			}
			message.edit(newcontent);
		}
	}
};

messageDelete.on('messageDelete', updateMessage);
//Note: message updates occur frequently because links embed even just a couple seconds after a message is sent 
messageUpdate.on('messageUpdate', updateMessage);


const filter = msg => msg.content != null && !msg.author.bot;
module.exports = {
    guildCommand: false,
	data: new SlashCommandBuilder()
		.setName('togglehyperchat')
		.setDescription('Join or leave a call')
		.addIntegerOption(option =>
            option.setName("hyperchannelid")
                .setDescription("Leave blank for a random channel. Set to 0 to leave. Make negative to join in 'private mode'.")
		)
		.addIntegerOption(option =>
            option.setName("timeout")
                .setDescription("How long, in minutes, to wait before leaving automatically after the last message. Default is 7.")
				.setMinValue(1)
				.setMaxValue(7)//it must be below 15 to avoid webhook error when replying pls fix better in the future.
		),
	async execute(interaction) {
		//check blacklist status. If command is coming from DMs, check global bans.
		const channel = interaction.channel;
		const isDM = channel.isDMBased();
		const blSeverity = (
			await blacklistItem.findOne({
				where: {serverInfoServerId: isDM 
					? globalAndTestGuildId 
					: interaction.guildId
				}
			}))?.severity 
			|| 0;
		if (blSeverity >= 2) return; //maybe replying would be a better experience than ignoring
		
		const client = interaction.client;
		const textChannelId = channel.id;
		const guildId = interaction.guildId
		let textChannel = textChannels[textChannelId];
		let hyperChannelId = interaction.options.getInteger('hyperchannelid');
		if (!isDM) currentServerInfo = await databaseModels.serverInfoDefault(serverInfo, guildId);
		if (!isDM && (!currentServerInfo || !currentServerInfo.get("serverSettings").allowhyperchats)) {
			interaction.reply("Hyperchats not enabled in this server! Toggle them on with /serversettings");
			return;
		} 

		let prefaceText = "";
		//If channel is in a hyperChannel already
		if (textChannel) {
			if (!hyperChannelId) {
				interaction.reply(`Leaving hyperchat channel ${textChannel.hyperChannelId} due to manual disconnection.`);
				textChannel.collector.stop("manual");
				return;
			} else {//hyperChannelId explicitly defined as nonzero value
				prefaceText = `Leaving hyperchat channel ${textChannel.hyperChannelId}. ` 
				textChannel.collector.stop("switching");
			}
		} else {
			//explicitly try to disconnect when not in a channel
			if (hyperChannelId === 0) { 
				interaction.reply({content: "You weren't connected to a channel in the first place!", ephemeral: true});
				return;
			} else if (!hyperChannelId) {
				//choose randomly from channels non-privately joined
				for (
					let possibleHyperChannelId of Object.keys(hyperChannels).sort(
						() => { return 0.5 - Math.random() }
					)
				) {
					for (const potentialChannel of hyperChannels[possibleHyperChannelId]) {
						if (!potentialChannel.privateConnection) {
							hyperChannelId = possibleHyperChannelId;
							break;
						}
					}
					//Found one? Great. No need to continue this loop.
					if (hyperChannelId) {
						break;
					}
				}
			}

		}

		hyperChannelId = (hyperChannelId 
			? Math.abs(hyperChannelId)
			//oh, there's no channels it could join? Choose a random one.
			: Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER)
		).toString();

		//Set a timeout time, default of 7 minutes. Max of 14 minutes due to dropping listeners past 15.
		const timeout = Math.min(interaction.options.getInteger('timeout'), 14) || 7;
		//i check if hci has a hcID like 3 times. condense later?
		hyperChannels[hyperChannelId] ??= [];
		const hyperChannel = hyperChannels[hyperChannelId];
		
		textChannels[textChannelId] = {
			channel,
			hyperChannelId,
			hyperChannel,
			privateConnection: 
				interaction.options.getInteger('hyperChannelId') < 0 && blSeverity < 1 
					? true 
					: false,//if random or otherwise...
			collector: channel.createMessageCollector({filter, idle: 60_000*timeout}),
			hyperMessageCache: {},
		};
		textChannel = textChannels[textChannelId];
		
		//I will probably want to set this as a textChannel property in the next update
		const channelName = channel.name 
			|| `${(await fullyResolveName(interaction.user)).displayName}'s DMs`;

		for (const textChannel of hyperChannel) {
			textChannel.channel.send(`${channelName} has joined the hyperchannel. Total connected: ${hyperChannel.length + 1}`);
		}

		const otherChannelsAmount = hyperChannel.push(textChannel);

		if (textChannel.privateConnection) {
			prefaceText += "Privately j"
		} else {
			prefaceText += "J"
			client.user.setActivity(`HC-${hyperChannelId}`, {type: ActivityType.Listening});
		}

		interaction.reply(
			`${prefaceText}oining hyperchat channel ${hyperChannelId}. Be respectful to others — especially their privacy — `
			+ `and follow Discord's TOS or I will take this feature away for your entire server.\r`
			+ `Currently ${otherChannelsAmount} channel${otherChannelsAmount > 1 ? "s" : ""} in this hyperchat.`
		);

		textChannel.collector.on('collect', async msg =>  {
			//benchmarking
			let t0 = performance.now();

			const { displayName, embedColor, avatarURL } = await fullyResolveName(isDM && msg.author, msg.member);

			senderString = `${displayName} | ${channelName}`
			if (!isDM && !currentServerInfo.get("serverSettings").anonymizeName) senderString += ` | ${interaction.guild.name}`;
			
			textChannel.hyperMessageCache[msg.id] = []
			const hyperMessage = textChannel.hyperMessageCache[msg.id];

			let embed = new EmbedBuilder()
			embed.setColor(embedColor);
			embed.setAuthor({
				name: senderString,
				iconURL: avatarURL
			})

			let content = msg.content
			const urls = [];
			msg.attachments.forEach(attachment => {
				content += ` [${attachment.contentType} attachment]`; //show type later
				urls.push(attachment.attachment);
			});
			msg.stickers.forEach(sticker => {
				content += " [sticker]"; //idk
				urls.push(sticker.url);
			})

			//Oftentimes embeds will appear as an update later.
			//Sometimes they'll be right with the original message.
			for (const userEmbed of msg.embeds) {
				console.log("Already got embed, url: ", userEmbed.data.url);
				content = content
					.replace(/\\/g, '/')
					.replace(new RegExp(userEmbed.data.url, 'g'),` [${userEmbed.data.type} embed]`)
				urls.push(userEmbed.data.url);
			}

			//asynchronously iterate through all the channels it needs to send a message to
			Promise.all(hyperChannel.map(async (currentTextChannel) => {
				//return if *that's* the channel it was sent from or if it was removed from the hyperChannel
				if (currentTextChannel === textChannel) return;

				const currentChannel = currentTextChannel.channel;

				embed.setDescription(content || null);
				if (msg.type === MessageType.Reply) {
					//if you replied to an extra-channel message via the bot then do this reply system
					const repliedToMessage = await msg.fetchReference();
					if (repliedToMessage.author.id === clientId && repliedToMessage.embeds?.[0]?.author?.name) {
						embed.setFooter({text:
							//TODO: get just the authors name when I work with message caching.
							`${repliedToMessage.embeds[0].author.name}: ${repliedToMessage.embeds[0].description}`
						})
					} else {
						//otherwise reply like this, getting some more information about the author's display name
						const { displayName } = await fullyResolveName(
							isDM && repliedToMessage.author, 
							repliedToMessage.member
						);
						embed.setFooter({text:
							`${displayName}: ${repliedToMessage.content}`
						})
					}
				} else {
					const lastMessage = (await currentChannel.messages.fetch({limit: 1})).first();
					//If it's a hyperchat by the same person without a reply to someone, 
					//just edit onto the previous message to avoid spamming everything up
					//it looks nice, but costs over a tenth of a second on my internet connection
					if (
						lastMessage?.embeds?.[0]?.author?.name === senderString
						&& !lastMessage?.embeds?.[0]?.footer
					) {
						embed.setDescription(
							lastMessage.embeds[0].description + "\n " + content
						);

						if (urls.length) currentChannel.send(urls)
						lastMessage.edit({
							embeds: [
								embed
							],
							allowedMentions: {parse: []}
						}).then(msg => hyperMessage.push(msg));

						console.log(performance.now() - t0);
						return;
					}
				}

				//at this point, all non-continuations go here
				//send the final message to the selected channel!

				console.log(performance.now() - t0);
				currentChannel.send({
					embeds: [embed],
					allowedMentions: {parse: []}
				}).then(msg => hyperMessage.push(msg));
				if (urls.length) currentChannel.send(urls.join("\n"));
			}));
		});

		textChannel.collector.on('end', (_collected, reason) => {
			hyperChannel.splice(hyperChannel.findIndex(textChannel => textChannel.channel.id === textChannelId), 1);
			for (textChannel of hyperChannel) {
				textChannel.channel.send(`${channelName} has left the hyperchannel. Total connected: ${hyperChannel.length}`);
			}
			delete textChannels[textChannelId];
			if (!hyperChannel.length) delete hyperChannels[hyperChannelId];

			//TODO: timeout message is brokey
			//Manual and switching reasons are handled earlier.
			if (reason === "timeout") channel.send(`Leaving hyperchat channel ${hyperChannelId} due to no one talking; timeout.`);

			client.user.setActivity('the phone', {type: ActivityType.Listening})
			
		});
    }
}