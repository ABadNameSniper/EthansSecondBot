const fs = require('fs');
const path = require('path');
const sequelize = require('../utils/sequelize');

const models = {};
const modelsPath = path.join(process.cwd(), './models');

// Read all model files in the current directory
fs.readdirSync(modelsPath)
.filter(file => file !== 'index.js')
.forEach(file => {
  const model = require(path.join(modelsPath, file));
  models[model.name] = model;
});

// Export the Sequelize instance and all models
module.exports = {
  sequelize,
  ...models,
};