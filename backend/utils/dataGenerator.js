const { faker } = require('@faker-js/faker');
const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

const generateMockData = (schema, count = 1) => {
  const result = [];
  
  for (let i = 0; i < count; i++) {
    const item = {};
    
    for (const [field, config] of Object.entries(schema)) {
      if (config.type === 'id') {
        item[field] = uuidv4();
      } else if (config.type === 'string') {
        if (config.faker) {
          // Handle faker.js methods
          const [namespace, method] = config.faker.split('.');
          if (faker[namespace] && faker[namespace][method]) {
            item[field] = faker[namespace][method]();
          } else {
            item[field] = faker.word.sample();
          }
        } else if (config.enum && Array.isArray(config.enum)) {
          item[field] = _.sample(config.enum);
        } else {
          item[field] = faker.word.sample();
        }
      } else if (config.type === 'number') {
        item[field] = config.min !== undefined && config.max !== undefined
          ? _.random(config.min, config.max)
          : _.random(1, 1000);
      } else if (config.type === 'boolean') {
        item[field] = Math.random() > 0.5;
      } else if (config.type === 'date') {
        item[field] = faker.date.recent().toISOString();
      } else if (config.type === 'array') {
        const arrayLength = config.length || _.random(1, 5);
        if (config.items && typeof config.items === 'object') {
          item[field] = Array.from({ length: arrayLength }, () => 
            generateMockData(config.items, 1)[0]
          );
        } else {
          item[field] = Array.from({ length: arrayLength }, () => faker.word.sample());
        }
      } else if (config.type === 'object' && config.properties) {
        item[field] = generateMockData(config.properties, 1)[0];
      }
    }
    
    result.push(item);
  }
  
  return result;
};

module.exports = {
  generateMockData
};