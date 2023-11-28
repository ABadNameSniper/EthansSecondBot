const { sequelize } = require('../models');

module.exports = {
    updateAllDB: async function() {
        sequelize.sync({force: false, alter: false})
        .then((res) => {
            console.log("Syncing models was succesful");
        });
    }
}