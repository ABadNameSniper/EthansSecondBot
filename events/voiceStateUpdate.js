const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require("@discordjs/voice");
const indexRoot = process.cwd()
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require('../utils/databaseModels');
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
userInfo.sync();

module.exports = {
	name: 'voiceStateUpdate',
	async execute(oldState, newState, client) {
        const user = newState.member.user;
        if(newState.channelId!==oldState.channelId && !user.bot) {
            const voiceChannel = newState.channel;
            if (voiceChannel) {
                const currentUserInfo = await databaseModels.userInfoDefault(userInfo, user.id);
                const audioFileName = currentUserInfo.get("introSelected");
                if (!audioFileName || audioFileName === "none") return;

                const connection = joinVoiceChannel({
                    channelId: newState.channelId,
                    guildId: newState.guild.id,
                    adapterCreator: newState.guild.voiceAdapterCreator
                });
                const player = createAudioPlayer();
                const resource = createAudioResource(indexRoot+'/assets/audio/intros/'+audioFileName, {inlineVolume: true});
                resource.volume.setVolume(0.05);
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