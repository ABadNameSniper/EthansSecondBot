module.exports = {
    //note: add server setting to disable/enable pinging (default false)
    regex: /@someone\b/gi,
    permissionRequired: "SendMessages",
    async execute(msg) {
        selectedMember = msg.channel.members.filter(
            member => member?.presence?.status === "online" && 
            member.user.id !== msg.author.id && 
            member.user.bot === false
        )?.random()?.user

        if (!selectedMember) {
            await msg.reply("There's no one here but you and I!");
            return
        }

        repliedMessage = await msg.reply({
            content: `@${selectedMember.displayName || selectedMember.username}`,
            fetchReply: true
        })
        
        repliedMessage.edit(`<@${selectedMember?.id}>`)
    }
}