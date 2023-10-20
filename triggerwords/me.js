module.exports = {
    regex: /@me\b|@ me\b/gi,
    permissionRequired: "SendMessages",
    async execute(msg) {
        msg.reply(msg.author.toString());
    }
}