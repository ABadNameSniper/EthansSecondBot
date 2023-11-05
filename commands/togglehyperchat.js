//Abandon hope all ye who enter...

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

//It'd probably be better if I could just put listeners directly into the channels. TODO
const messageUpdate = require('./../events/messageUpdate').emitter;
const messageDelete = require('./../events/messageDelete').emitter;

const embeddablesCollectionMetaTypes = ['embeds', 'attachments', 'stickers']

var textChannels = {
	/*
	'1243798753': {
		id: '1243798753',
		hyperChannelId: '1', //necessary because the hyperchannels are arrays of textChannel objects and cannot store their own ID
		hyperChannel: hyperChannel
		collector: collector,
		privateConnection: false,
		lastRecievedMessageId: msg.id, actually could be worth keeping in conjunction...
		goAhead: new Promise
	}
	*/

}
var hyperChannels = {
/*
	'123456' : [textChannel, textChannel]
	'789101' : [textChannel]
*/
}

//This cache isn't so good. It just records the last message id. 
//A better implementation would be an entire array or something.
var hypermessageidcache;

var hyperMessageCache = {
	/*
	"102039847832": { //Original message ID
		originalChannel: "12897123489"
		otherChannels: {
			//Should be channelId/messageId pair so as to be able to easily drop channels from the message cache
			//when they leave the hyperchat
			"83298234793": 018723498234,
			"78324982343": 832489123432,
		}
	}


	*/
}

var anonymousCache = [];

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

const updateEmbeds = async function(oldmsg, newmsg, client) {
	//Gate out bots and the channel the message was sent in
	if (oldmsg?.author?.bot || !Object.keys(textChannels).includes(oldmsg.channelId)) return;

	let scansets; //amount of images to fetch
	let scanreps; //upper limit to retry
	if (hypermessageidcache === oldmsg.id) {
		console.log('Updated message was the last hypermessage of all hyperChannels');
		scansets = 2;
		scanreps = 1;
	} else if (textChannels[oldmsg.channelId].lastRecievedMessageId === oldmsg.id){
		console.log('Updated message was the last hypermessage in this textchannel')
		scansets = 4;
		scanreps = 3;
	} else {
		//could be capped by finding the hyperChannel origin
		console.log("Couldn't find updated message as a last message. Widening search.")
		scansets = 10;
		scanreps = 5;
	}

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

	//Going through the release, I have no idea what .goAhead is for
	//upon further examination I think it's to wait until the previous message's sending/editing
	// has been confirmed to have been recieved before sending a new one.
	// Seems unnecessary, will probably remove next update.
	if (textChannels[oldmsg.channelId].goAhead) {
		await textChannels[oldmsg.channelId].goAhead;
	}

	Promise.all(
		textChannels[oldmsg.channelId].hyperChannel.map(async (currentTextChannel) => {
		if (currentTextChannel.id === oldmsg.channelId) return;
		let lastScannedMessage = null;
		const currentChannelMessages = (await client.channels.fetch(currentTextChannel.id)).messages;
		for (let i = 0; i < scanreps; i ++) {
			for (const [msgid, message] of await currentChannelMessages.fetch({limit: scansets, before: lastScannedMessage})) {
				//reading through this, it looked like it should've been continue. Originally break
				//Just checking if it was sent by the bot
				if (message.author.id !== clientId) continue;

				//Using resolveName to search for a user, not display who they are this time!
				//This is because I had a terrible idea to search old messages, instead of utilize a cache.
				const { displayName, avatarURL} = await resolveName(
					oldmsg.author,
					oldmsg.member, 
					oldmsg.channel.isDMBased(), 
					anonymousCache.findIndex(element => element === oldmsg.author.id)
				);

				if (message.embeds?.[0]?.data?.type === "rich") {


					//Genius authentication
					const indexOfBar = message.embeds[0].author.name.indexOf("|");
					const offset = indexOfBar === -1 
						? 0 
						: indexOfBar + 2;
					const adjustedEmbedName = message.embeds[0].author.name.slice(offset, message.embeds[0].author.name.length);
					if (adjustedEmbedName === displayName && message.embeds[0].author.iconURL === avatarURL) {
						//the ONLY embed since it's a normal hyperchat rich embed
						let editedEmbed = message.embeds[0];
						let newDescription = editedEmbed.data.description.replace(oldmsg.content, newmsg?.content || '');
						//Simply deleting the hyperchat if the original was deleted.
						if (!newDescription.length) {
							message.delete();
							return;
						}
						editedEmbed.data.description = (
							newDescription
						);
						message.edit({
							embeds: [editedEmbed]
						});

						//Reply to rich text with list of URLs for Discord to automatically embed

						//After review, I'm not sure what this replace is for
						newDescription = newDescription.replace(/\\/g, '/'); 
						allURLs = allNewEmbeddables.map(newEmbeddable => {
							newDescription = newDescription
								.replace(new RegExp(newEmbeddable.url, 'g'),` [${newEmbeddable.type}]`);
							return newEmbeddable.url;
						}).join("\n").toString();
						message.reply(allURLs);

						//The rich embed comes *before* the additional embeds, meaning the for loop
						//will get to them after, meaning if it finds it, everything else should
						//have already been done.
						return; 
					}
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

					//Not perfect
					succesfulUpdate = true;
				}
				console.log("continuing scanning, ", scanreps, " and ", scansets);
				lastScannedMessage = message.id;
			}
		}
		if (!succesfulUpdate) oldmsg.author.send(
			"Couldn't edit/delete hypermessage: " + oldmsg.url + "\n let an admin know about your issue!"
		);
	}))
};

messageDelete.on('messageDelete', updateEmbeds);
//Note: message updates occur frequently because links embed even just a couple seconds after a message is sent 
messageUpdate.on('messageUpdate', updateEmbeds);


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
		const isDM = interaction.channel.isDMBased();
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
		const textChannelId = interaction.channelId;
		let textChannel = textChannels[textChannelId];
		let hyperChannelId = interaction.options.getInteger('hyperChannelId');
		if (!isDM) currentServerInfo = await databaseModels.serverInfoDefault(serverInfo, interaction.guildId);
		if (!isDM && (!currentServerInfo || !currentServerInfo.get("serverSettings").allowhyperchats)) {
			interaction.reply("Hyperchats not enabled in this server! Toggle them on with /serversettings");
			return;
		} 

		let prefaceText = "";
		//If channel is in a hyperChannel already
		if (textChannel) {
			if (!hyperChannelId) {
				interaction.reply(`Leaving hyperchat channel ${textChannel.hyperChannelId} due to manual disconnection by <@${interaction.user.id}>.`);
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

		hyperChannelId = hyperChannelId 
			? Math.abs(hyperChannelId)
			//oh, there's no channels it could join? Choose a random one.
			: Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER);
		
		hyperChannelId = hyperChannelId.toString();
		
		//Set a timeout time, default of 7 minutes. Max of 14 minutes due to dropping listeners past 15.
		const timeout = Math.min(interaction.options.getInteger('timeout'), 14) || 7;
		//i check if hci has a hcID like 3 times. condense later?
		if (!hyperChannels[hyperChannelId]) hyperChannels[hyperChannelId] = [];
		const hyperChannel = hyperChannels[hyperChannelId];
		
		textChannels[textChannelId] = {
			id: textChannelId,
			hyperChannelId,
			hyperChannel,
			privateConnection: 
				interaction.options.getInteger('hyperChannelId') < 0 && blSeverity < 1 
					? true 
					: false,//if random or otherwise...
			collector: interaction.channel.createMessageCollector({filter, idle: 60_000*timeout})
		};
		textChannel = textChannels[textChannelId];
		
		const otherChannelsAmount = hyperChannel.push(textChannel);

		if (textChannel.privateConnection) {
			prefaceText += "Privately j"
		} else {
			prefaceText += "J"
			client.user.setActivity(`HC-${hyperChannelId}`, {type: ActivityType.Listening});
		}

		//const otherChannelsAmount = Object.keys(hyperChannel).length;

		interaction.reply(
			`${prefaceText}oining hyperchat channel ${hyperChannelId}. Be respectful to others — especially their privacy — `
			+ `and follow Discord's TOS or I will take this feature away for your entire server.\r`
			+ `Currently ${otherChannelsAmount} channel${otherChannelsAmount > 1 ? "s" : ""} in this hyperchat.`
		);

		textChannel.collector.on('collect', async msg =>  {
			//benchmarking
			let t0 = performance.now();

			await textChannel?.goAhead;
			textChannel.goAhead = new Promise(function(resolve, reject) {
				textChannel.promiseResolve = resolve;
				textChannel.promiseReject = reject;
			});

			textChannel.lastRecievedMessageId = msg.id;
			hypermessageidcache = msg.id;

			let embed = new EmbedBuilder()

			let senderString = "";

			if (!isDM) {
				//TODO: this should probably be cached.
				[currentServerInfo, currentServer] = await Promise.all([
					serverInfo.findOne({where: {serverId: msg.guildId}}),
					client.guilds.fetch(msg.guildId)
				])
				//if you can find the server and see anonymizeName isn't true
				if (currentServerInfo && !currentServerInfo.get("serverSettings").anonymizeName) {
					senderString += currentServer.name + " | ";
				}
			}

			var anonId = anonymousCache.findIndex(element => element === msg.author.id);
			if (anonId === -1) {
				anonId = anonymousCache.length;
				anonymousCache.push(msg.author.id);
			}
			//TODO: two awaits... should definitely probably be cached.
			const { displayName, embedColor, avatarURL } = await resolveName(
				await msg.author.fetch(true), 
				msg.member, 
				isDM, 
				anonId
			);
			senderString += displayName;
			embed.setColor(embedColor);
			embed.setAuthor({
				name: senderString,
				iconURL: avatarURL
			})

			//Clean the message!
			//TODO: do this with @ing roles and users too.
			let content = msg.content.replace("@everyone", "@ everyone").replace("@here", "@ here") || '';//certified js moment

			let urls = ''
			msg.attachments.forEach(attachment => {
				content += ` [${attachment.contentType} attachment]`; //show type later
				urls += attachment.attachment+"\n";
			});
			msg.stickers.forEach(sticker => {
				content += " [sticker]"; //idk
				urls += sticker.url + "\n";
			})

			//Oftentimes embeds will appear as an update later.
			//Sometimes they'll be right with the original message.
			for (const userEmbed of msg.embeds) {
				console.log("Already got embed, url: ", userEmbed.data.url);
				content = content
					.replace(/\\/g, '/')
					.replace(new RegExp(userEmbed.data.url, 'g'),` [${userEmbed.data.type} embed]`)
				urls += userEmbed.data.url + "\n";
			}

			//asynchronously iterate through all the channels it needs to send a message to
			Promise.all(hyperChannel.map(async (currentTextChannel) => {
				//return if *that's* the channel it was sent from or if it was removed from the hyperChannel
				if (currentTextChannel === textChannel) return;

				const currentChannel = await client.channels.fetch(currentTextChannel.id);

				embed.setDescription(content || null);
				if (msg.type === MessageType.Reply) {
					//if you replied to an extra-channel message via the bot then do this reply system
					const repliedToMessage = await msg.fetchReference();
					if (repliedToMessage.author.id === clientId && repliedToMessage.embeds?.[0]?.author?.name) {
						embed.setFooter({text:
							`${repliedToMessage.embeds[0].author.name}: ${repliedToMessage.embeds[0].description}`
						})
					} else {
						//otherwise reply like this, getting some more information about the author's display name
						const { displayName } = await resolveName(
							repliedToMessage.author, 
							repliedToMessage.member, 
							isDM, 
							anonymousCache.findIndex(element => element === msg.author.id)
						);
						embed.setFooter({text:
							`${displayName}: ${repliedToMessage.content}`
						})
					}
				} else {
					const lastMessageCollection = await currentChannel.messages.fetch({limit:1});
					const lastMessage = lastMessageCollection.first();
					//If it's a hyperchat by the same person without a reply to someone, 
					//just edit onto the previous message to avoid spamming everything up (things look nice)
					if (
						lastMessage?.embeds?.[0]?.author?.name === senderString
						&& !lastMessage?.embeds?.[0]?.footer
					) {
						embed.setDescription(
							lastMessage.embeds[0].description + "\n " + content
						);

						if (urls!=='') await currentChannel.send(urls)
						lastMessage.edit({
							embeds: [
								embed
							]
						}).then((msg)=> {
							textChannel.promiseResolve();
						});

						console.log(performance.now()-t0);
						return;
					}
				}

				//at this point, all non-continuations go here
				//send the final message to the selected channel!

				console.log(performance.now() - t0);
				currentChannel.send({
					embeds: [embed]
				}).then((msg)=> {
					textChannel.lastSentMessageId = msg.id;
					textChannel.promiseResolve();
				});
				if (urls) currentChannel.send(urls);
			}));
		});

		textChannel.collector.on('end', (_collected, reason) => {
			delete textChannels[textChannelId];
			hyperChannel.splice(hyperChannel.findIndex(textChannel => textChannel.id === textChannelId), 1);
			if (!hyperChannel.length) delete hyperChannels[hyperChannelId];

			//Manual and switching reasons are handled earlier.
			//TODO: send a message from the bot notifying the other textChannels that this one left.
			if (reason === "timeout") interaction.channel.send(`Leaving hyperchat channel ${hyperChannelId} due to no one talking; timeout.`);

			client.user.setActivity('the phone', {type: ActivityType.Listening})
			
		});
    }
}