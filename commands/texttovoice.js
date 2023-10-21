const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require("@discordjs/voice");

const directory = './assets/audio/texttovc/';
const { readdirSync, rmSync } = require('fs');
readdirSync(directory).forEach(f => rmSync(`${directory}${f}`))

const discordTTS = require('discord-tts');

const vcObj = {
    //id1: []
};

const endTTS = function(collected, voiceChannelId) {
    vcObj[voiceChannelId].player.stop();
    vcObj[voiceChannelId].connection.destroy();
    vcObj[voiceChannelId].msgCollector.stop();
    vcObj[voiceChannelId] = null;
}

module.exports = {
    guildCommand: true,
	data: new SlashCommandBuilder()
    .setName('texttovoice')
    .setDescription('No mic but you still want your friends to hear you? This is it!'),
    execute: async function(interaction) {
        const textChannel = interaction.channel;

        const voiceChannelId = interaction?.member?.voice?.channelId;
        if (!voiceChannelId) {
            interaction.reply("You need to be in a voice chat to use this command!");
            return;
        }
        if (vcObj?.[voiceChannelId]) {
            interaction.reply("Disconnecting");
            vcObj[voiceChannelId].msgCollector.stop();
            return;
        }
        interaction.reply("Success! After 10 minutes of no one talking, you'll need to use the command again if you want to continue using text-to-VC.")
        vcObj[voiceChannelId] = {
            connection: joinVoiceChannel({
                channelId: voiceChannelId,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator
            }),
        };

        vcObj[voiceChannelId].player = createAudioPlayer();
        const player = vcObj[voiceChannelId].player
        const subscription = vcObj[voiceChannelId].connection.subscribe(player);
        vcObj[voiceChannelId].msgCollector = textChannel.createMessageCollector({idle: 60_000*10});
        const msgCollector = vcObj[voiceChannelId].msgCollector;

        let msgQueue = [];
        let playingStatus = false;

        await vcObj[voiceChannelId].connection.on(VoiceConnectionStatus.Ready, async () => {
            return true;
        })
        
        player.on(AudioPlayerStatus.Idle, ()=>{//automatically finish queueue
            
            playingStatus = false;
            if (msgQueue[0]) {
                player.play(msgQueue.shift());
            }
        });
        player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
            playingStatus = true;
        })

        msgCollector.on('collect', msg => {
            if (msg.author?.bot) return;
            if (msg.member.voice?.channelId) {

                //push newly created audio resources onto the queue after checking if they're an attachment, 
                //spliting by 200 characters (less, depending on how words are positioned)
                //this breaks sometimes, changed 1 to 0
                msgQueue.push(
                    ...
                    (
                        msg.content || 
                        "" + 
                        msg.attachments?.map(attachment => {
                            print("Attachment type: " + attachment.contentType)
                            return attachment.contentType;
                        }).join(', ') ||
                        ""
                    )
                    .match(/.{1,200}/g)
                    .map(substring => {
                        console.log("Substring:" + substring + ":endSubstring")
                        return createAudioResource(discordTTS.getVoiceStream(substring));
                    })
                    .values()
                );
                //No worries. If you're already playing something, the rest will automatically be played
                if (playingStatus) return; 
                player.play(msgQueue.shift());

            }
        })
        msgCollector.on('end', collected => {endTTS(collected, voiceChannelId)});
    }
}