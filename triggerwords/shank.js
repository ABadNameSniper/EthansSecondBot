module.exports = {
    regex: /shank\b|shamk\b/gi,
    permissionRequired: "AddReactions",
    async execute(msg) {
        msg.react("🔪");
    }
};