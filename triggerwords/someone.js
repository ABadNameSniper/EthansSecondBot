module.exports = {
    //note: add server setting to disable/enable pinging (default false)
    regex: /@someone\b/gi,
    permissionRequired: "SendMessages",
    async execute(msg) {
        selectedMember = msg.channel.members.filter(
            member => member?.presence?.status === "online" && 
            member.user.id !== msg.author.id && 
            !member.user.bot
        )?.random()?.user

        if (!selectedMember) {
            msg.reply("There's no one here but you and I!");
            return
        }
        
        msg.reply({
            content: `<@${selectedMember?.id}>`,
            allowedMentions: {parse: []}
        })
    }
}