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

var textchannelinfo = {
	/*
	'1243798753': {
		hyperchannelId: "1",
		collector: collector,
		privateConnection: false,
		lastRecievedMessageId: msg.id, actually could be worth keeping in conjunction...
		goAhead: new Promise
	}
	*/

}
var hyperchannelinfo = {
	/* genius past me for making these objects for no reason
		'123456' : {
			//'lastRecievedMessageId': msg.id //a little yucky
			'12343798753' : true,
			'35789734321' : true,
		},
		'789101' : {
			//'lastRecievedMessageId': msg.id
			'1223894584': true
		}
		
	*/
}

//This cache isn't so good. It just records the last message id. 
//A better implementation would be an entire array or something.
var hypermessageidcache;

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
		//uniquely new embed
		//console.log("Look at this embed in the updated message! ", newEmbed);
	}
	return [uniqueEmbeddables, commonEmbeddables];
}

const updateEmbeds = async function(oldmsg, newmsg, client) {
	console.log(newmsg);
	//Gate out bots and the channel the message was sent in
	if (oldmsg?.author?.bot || !Object.keys(textchannelinfo).includes(oldmsg.channelId)) return;

	let scansets; //amount of images to fetch
	let scanreps; //upper limit to retry
	if (hypermessageidcache === oldmsg.id) {
		console.log('Updated message was the last hypermessage of all hyperchannels');
		scansets = 2;
		scanreps = 1;
	} else if (textchannelinfo[oldmsg.channelId].lastRecievedMessageId === oldmsg.id){
		console.log('Updated message was the last hypermessage in this textchannel')
		scansets = 4;
		scanreps = 3;
	} else {
		//could be capped by finding the hyperchannel origin
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
	if (textchannelinfo[oldmsg.channelId].goAhead) {
		await textchannelinfo[oldmsg.channelId].goAhead;
	}

	Promise.all(
		Object.keys(hyperchannelinfo[textchannelinfo[oldmsg.channelId].hyperchannelId])
		.map(async (iteratingChannelId) => 
	{
		if (iteratingChannelId === oldmsg.channelId) return;
		let lastScannedMessage = null;
		const currentChannelMessages = (await client.channels.fetch(iteratingChannelId)).messages;
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
//Note: happens quite often,
//since Discord can take a bit to embed links into the message
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
				//.setMinValue(0)
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
		const channelId = interaction.channelId;
		let hyperchannelId = interaction.options.getInteger('hyperchannelid');
		if (!textchannelinfo[channelId]) textchannelinfo[channelId] = {};
		if (!isDM) currentServerInfo = await databaseModels.serverInfoDefault(serverInfo, interaction.guild.id);
		if (!isDM && (!currentServerInfo || !currentServerInfo.get("serverSettings").allowhyperchats)) {
			interaction.reply("Hyperchats not enabled in this server! Toggle them on with /serversettings");
			return;
		} 

		//If channel is in a hyperchannel already, toggle off (if you're not changing)
		if (textchannelinfo[channelId].hyperchannelId) {
			if (!hyperchannelId) {
				if (textchannelinfo[channelId].collector) {
					interaction.reply(
						`Leaving hyperchat channel ${textchannelinfo[channelId].hyperchannelId} due to manual disconnection`
						);
					textchannelinfo[channelId].collector.stop("manual disconnection.");
					return;
				}
			}
		} else {
			//explicitly try to disconnect when not in a channel
			if (hyperchannelId === 0) { 
				interaction.reply({content: "You weren't connected to a channel in the first place!", ephemeral: true});
				return;
			} else if (!hyperchannelId) {
				//choose randomly from channels non-privately joined
				scrambledHyperchannels = Object.keys(hyperchannelinfo).sort(() => { return 0.5 - Math.random() });
				for (let possibleHyperchannelId of scrambledHyperchannels) {
					const value = hyperchannelinfo[possibleHyperchannelId];
					for (let investigateChannel in value) {
						if (!textchannelinfo[investigateChannel].privateConnection) {
							hyperchannelId = possibleHyperchannelId;
							break;
						}
					}
					//Found one? Great. No need to continue this loop.
					if (hyperchannelId) {
						break;
					}
				}
			}

		}

		//oh, there's no channels it could join? Choose a random one.
		if (!hyperchannelId) {
			hyperchannelId = Math.trunc(Math.random()*Number.MAX_SAFE_INTEGER);
		}

		hyperchannelId = Math.abs(hyperchannelId);
		

		//Here's an abomination of mixing around strings
		let prefaceText = textchannelinfo[channelId].hyperchannelId 
			? `Leaving hyperchat channel ${textchannelinfo[channelId].hyperchannelId}. ` 
			: ""//if there's already something there, let the user know
		textchannelinfo[channelId].privateConnection = 
			interaction.options.getInteger('hyperchannelid') < 0 
			&& blSeverity < 1 
				? true 
				: false;//if random or otherwise...

		if (textchannelinfo[channelId].privateConnection) {
			prefaceText+="Privately j"
		} else {
			prefaceText+="J"
			client.user.setActivity(`HC-${hyperchannelId}`, {type: ActivityType.Listening});
		}

		//Set a timeout time, default of 7 minutes. Max of 14 minutes due to dropping listeners past 15.
		const timeout = Math.min(interaction.options.getInteger('timeout'), 14) || 7;
		//i check if hci has a hcID like 3 times. condense later?
		if (!hyperchannelinfo[hyperchannelId]) hyperchannelinfo[hyperchannelId] = {};
		if (textchannelinfo[channelId].collector) textchannelinfo[channelId].collector.stop("switching");
		
		textchannelinfo[channelId].hyperchannelId = hyperchannelId;
		hyperchannelinfo[hyperchannelId][channelId] = true;

		const otherChannelsAmount = Object.keys(hyperchannelinfo[hyperchannelId]).length;

		interaction.reply(
			`${prefaceText}oining hyperchat channel ${hyperchannelId}. Be respectful to others — especially their privacy — `
			+ `and follow Discord's TOS or I will take this feature away for your entire server.\r`
			+ `Currently ${otherChannelsAmount} channel${otherChannelsAmount > 1 ? "s" : ""} in this hyperchat.`
		);

		textchannelinfo[channelId].collector = interaction.channel.createMessageCollector({filter, idle: 60_000*timeout});
		textchannelinfo[channelId].collector.on('collect', async msg =>  {
			//benchmarking
			let t0 = performance.now();

			await textchannelinfo[channelId]?.goAhead;
			textchannelinfo[channelId].goAhead = new Promise(function(resolve, reject) {
				textchannelinfo[channelId].promiseResolve = resolve;
				textchannelinfo[channelId].promiseReject = reject;
			});

			textchannelinfo[channelId].lastRecievedMessageId = msg.id;
			hypermessageidcache = msg.id;

			let embed = new EmbedBuilder()

			let senderString = "";

			if (!isDM) {
				
				[currentServerInfo, currentServer] = await Promise.all([
					serverInfo.findOne({where: {serverId: msg.guild.id}}),
					client.guilds.fetch(msg.guild.id)
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
				urls+=attachment.attachment+"\n";
			});
			msg.stickers.forEach(sticker => {
				content += " [sticker]"; //idk
				urls += sticker.url+"\n";
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
			Promise.all(Object.keys(hyperchannelinfo[hyperchannelId]).map(async (iteratingChannelId) => {
				//return if *that's* the channel it was sent from or if it was removed from the hyperchannel
				if (
					iteratingChannelId === channelId
					//Not sure why this second part is here. Do null values appear in the map?
					|| !hyperchannelinfo[hyperchannelId][iteratingChannelId]
				) return;

				const currentChannel = await client.channels.fetch(iteratingChannelId);

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
							textchannelinfo[channelId].promiseResolve();
						});

						console.log(performance.now()-t0);
						return;
					}
				}

				//at this point, all non-continuations go here
				//send the final message to the selected channel!

				console.log(performance.now()-t0);
				currentChannel.send({
					embeds: [
						embed
					]
				}).then((msg)=> {
					textchannelinfo[channelId].lastSentMessageId = msg.id;
					textchannelinfo[channelId].promiseResolve();
				});
				if (urls!=='') currentChannel.send(urls);
			}));
		});

		textchannelinfo[channelId].collector.on('end', (_collected, reason) => {
			textchannelinfo[channelId] = null;
			hyperchannelinfo[hyperchannelId][channelId] = null;

			//eval if any channels remain
			const cleanup = !hyperchannelinfo[hyperchannelId].some(remaining => remaining);
			if (cleanup) hyperchannelinfo[hyperchannelId] = null;
			//cleanup would be slightly more extensive if I had message update/delete events per channel 


			//more clarity
			if (reason) reason = "no one talking; timout.";

			//interaction.followUp(`Leaving hyperchat channel ${hyperchannelId} due to ${reason}`);
			interaction.channel.send(`Leaving hyperchat channel ${hyperchannelId} due to ${reason}`);

			client.user.setActivity('the phone', {type: ActivityType.Listening})
			
		});
    }
}