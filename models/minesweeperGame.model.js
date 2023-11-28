const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const minesweeperGame = sequelize.define('minesweeperGame', {
    time: {
        type: DataTypes.INTEGER//measured in ms
    },
    difficulty: {
        type: DataTypes.STRING
    }
});

module.exports = minesweeperGame;