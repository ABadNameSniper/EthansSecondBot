module.exports = {
    regex: /egg|eggs\b/gi,
    permissionRequired: "AddReactions",
    async execute(msg) {
        msg.react("🥚");
    }
};