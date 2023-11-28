const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require("@discordjs/voice");
const path = require('path')
const { savedUser } = require('../models');

module.exports = {
	name: 'voiceStateUpdate',
	async execute(oldState, newState) {
        const user = newState.member.user;
        if(newState.channelId !== oldState.channelId && !user.bot) {
            const voiceChannel = newState.channel;
            if (voiceChannel) {
                const [currentUser] = await savedUser.findOrCreate({where: {userId: user.id}});
                const audioFileName = currentUser.introSelected;
                if (!audioFileName || audioFileName === "none") return;

                const connection = joinVoiceChannel({
                    channelId: newState.channelId,
                    guildId: newState.guild.id,
                    adapterCreator: newState.guild.voiceAdapterCreator
                });
                const player = createAudioPlayer();
                const resource = createAudioResource(
                    path.join(path.resolve(__dirname, '../assets/audio/intros'), audioFileName), 
                    {inlineVolume: true}
                );
                resource.volume.setVolume(0.25);
                connection.on(VoiceConnectionStatus.Ready, () => {
                    connection.subscribe(player);
                    player.play(resource);
                    player.on(AudioPlayerStatus.Idle, () => {
                        player.stop();
                        connection.destroy();
                    })
                })
            }
         }
    }
}