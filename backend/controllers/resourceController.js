const { faker, ar } = require('@faker-js/faker');
const Endpoint = require('../models/Endpoint');
const Resource = require('../models/Resource');

class ResourceController {
    static getArrayOfMapsOfRelationshipFieldNEndpointIdFromSchema(schema){
      const relationshipIds = [];
      if (schema.type === 'object' && schema.properties) {
        Object.entries(schema.properties).forEach(([key, prop]) => {
          if (prop.type === 'relationship'){
            const relationship = {};
            relationship.field = key;
            relationship.endpointId = prop.endpointId;
            relationship.isMasterDetail = prop.masterDetail || true;
            relationshipIds.push(relationship);
          } else if (prop.type === 'object' && prop.properties){
            relationshipIds.push(...ResourceController.getArrayOfMapsOfRelationshipFieldNEndpointIdFromSchema(prop));
          } else if (prop.type === 'array' && prop.items){
            relationshipIds.push(...ResourceController.getArrayOfMapsOfRelationshipFieldNEndpointIdFromSchema(prop.items));
          }
        })
      }
      return relationshipIds;
    }
    static getRandomInteger(max) {
      return Math.trunc(Math.random() * max);
    }
    static async generateMockData(schema, count, seed) {
      console.log("generateMockData")
      const data = [];
      const arrayOfMapsOfRelationshipFieldNEndpointId = ResourceController.getArrayOfMapsOfRelationshipFieldNEndpointIdFromSchema(schema);
      console.log("arrayOfMapsOfRelationshipFieldNEndpointId: ",arrayOfMapsOfRelationshipFieldNEndpointId)
      const mapOfRelationshipFieldNEndpoints = {};
      var maxCountOfParentResourceIds = 0;
      for (const mapOfRelationshipFieldNEndpointId of arrayOfMapsOfRelationshipFieldNEndpointId){
        console.log("mapOfRelationshipFieldNEndpointId.endpointId", mapOfRelationshipFieldNEndpointId.endpointId)
        const resourceIdsByEndpoints = await Resource.findIdsByEndpointId(mapOfRelationshipFieldNEndpointId.endpointId);
        console.log("resourceIdsByEndpoints: ",resourceIdsByEndpoints)
        const resourceIds = resourceIdsByEndpoints.map(resource => resource.id);
        mapOfRelationshipFieldNEndpoints[mapOfRelationshipFieldNEndpointId.field] = resourceIds;
        if (resourceIds.length > maxCountOfParentResourceIds) {
          maxCountOfParentResourceIds = resourceIds.length;
        }
      }
      
      if (maxCountOfParentResourceIds > 0) count *= maxCountOfParentResourceIds;
      for (let i = 0; i < count; i++) {
        if (seed) {
          faker.seed(seed+i); // Set seed for reproducible results
        }
        const mockItem = {};
        var parentResourceIds = '';
        if (schema.type === 'object' && schema.properties) {
          // Object.entries(schema.properties).forEach(async ([key, prop]) => {
          for (const [key, prop] of Object.entries(schema.properties)) {
            console.log("prop.type: ",prop.type)
            if (prop.faker) {
              const [module, method] = prop.faker.split('.');
              if (faker[module] && faker[module][method]) {
                const fakerParams = {};
                // Numeric parameters
                if (prop.min !== undefined) fakerParams.min = prop.min;
                if (prop.max !== undefined) fakerParams.max = prop.max;
                // String parameters
                if (prop.length !== undefined) fakerParams.length = prop.length;
                if (prop.prefix !== undefined) fakerParams.prefix = prop.prefix; //e.g. prefix for strings
                if (prop.suffix !== undefined) fakerParams.suffix = prop.suffix; //e.g. suffix for strings
                if (prop.minLength !== undefined) fakerParams.minLength = prop.minLength;
                if (prop.maxLength !== undefined) fakerParams.maxLength = prop.maxLength;
                if (prop.casing !== undefined) fakerParams.casing = prop.casing;  //e.g. upper, lower
                
                // Call the Faker method with parameters if provided
                mockItem[key] = Object.keys(fakerParams).length
                  ? faker[module][method](fakerParams)
                  : faker[module][method]();
              } else {
                mockItem[key] = prop.default || null;
              }
            } else if (prop.type === 'object' && prop.properties) {
              console.log("prop: ",prop)
              const value = await ResourceController.generateMockData(prop, 1, null)[0]; 
              console.log("value: ",value)
              mockItem[key] = value; 
            } else if (prop.type === 'relationship') {
              console.log("I am relationship field");
              var parentRelationshipId = '';
              const parentIds = mapOfRelationshipFieldNEndpoints[key];
              console.log("parentIds: ",parentIds);
              const numParents = parentIds.length;
              console.log("numParents: ",numParents);
              
              if (numParents > 0) {
                if (prop.masterDetail === true) {
                  // SEQUENTIAL/CYCLICAL SELECTION
                  // Ensures that for count * numParents items, the parent IDs cycle sequentially
                  const parentIndex = i % numParents;
                  parentRelationshipId = parentIds[parentIndex];
                  console.log("parentIndex: ",parentIndex);
                  console.log("parentRelationshipId: ",parentRelationshipId);


                } else {
                  const nullPercentage = prop.nullPercentage || 10;
                  parentRelationshipId = mapOfRelationshipFieldNEndpoints[key][ResourceController.getRandomInteger(mapOfRelationshipFieldNEndpoints[key].length * (nullPercentage / 100 + 1))] || null;
                }
              } else {
                  parentRelationshipId = null; // No parents available
              }
              mockItem[key] = parentRelationshipId;
              parentResourceIds += parentRelationshipId + ',';
            } else if (prop.type === 'array' && prop.items) {
              let itemCount = 1; // default
              if (prop.count !== undefined) {
                itemCount = prop.count;
              } else if (prop.minItems !== undefined && prop.maxItems !== undefined) {
                itemCount = faker.number.int({ min: prop.minItems, max: prop.maxItems });
              } else if (prop.minItems !== undefined) {
                itemCount = prop.minItems;
              }
              mockItem[key] = await ResourceController.generateMockData(prop.items, itemCount, seed ? seed + i : null);
              } else {
              mockItem[key] = prop.default || null;
            }
          };
        } 
        data.push({parentResourceIds, ...mockItem});
      }
      return data;
    }
  
  
  static async generateMockData(schema, count, seed) {
  const data = [];
  const arrayOfMapsOfRelationshipFieldNEndpointId = ResourceController.getArrayOfMapsOfRelationshipFieldNEndpointIdFromSchema(schema);
  const mapOfRelationshipFieldNEndpoints = {};
  let maxCountOfParentResourceIds = 0;

  for (const mapOfRelationshipFieldNEndpointId of arrayOfMapsOfRelationshipFieldNEndpointId) {
    const resourceIdsByEndpoints = await Resource.findIdsByEndpointId(mapOfRelationshipFieldNEndpointId.endpointId);
    const resourceIds = resourceIdsByEndpoints.map(resource => resource.id);
    mapOfRelationshipFieldNEndpoints[mapOfRelationshipFieldNEndpointId.field] = resourceIds;
    if (resourceIds.length > maxCountOfParentResourceIds) {
      maxCountOfParentResourceIds = resourceIds.length;
    }
  }

  if (maxCountOfParentResourceIds > 0) count *= maxCountOfParentResourceIds;

  for (let i = 0; i < count; i++) {
    if (seed) {
      faker.seed(seed + i); // Set seed for reproducible results
    }
    const mockItem = {};
    let parentResourceIds = ''; // Included in output even if empty

    if (schema.type === 'object' && schema.properties) {
      // Use for...of to handle async operations
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (prop.faker) {
          const [module, method] = prop.faker.split('.');
          if (faker[module] && faker[module][method]) {
            const fakerParams = {};
            // Numeric parameters
            if (prop.min !== undefined) fakerParams.min = prop.min;
            if (prop.max !== undefined) fakerParams.max = prop.max;
            // String parameters
            if (prop.length !== undefined) fakerParams.length = prop.length;
            if (prop.prefix !== undefined) fakerParams.prefix = prop.prefix;
            if (prop.suffix !== undefined) fakerParams.suffix = prop.suffix;
            if (prop.minLength !== undefined) fakerParams.minLength = prop.minLength;
            if (prop.maxLength !== undefined) fakerParams.maxLength = prop.maxLength;
            if (prop.casing !== undefined) fakerParams.casing = prop.casing;

            // Call the Faker method with parameters if provided
            mockItem[key] = Object.keys(fakerParams).length
              ? faker[module][method](fakerParams)
              : faker[module][method]();
          } else {
            mockItem[key] = prop.default || null;
          }
        } else if (prop.type === 'object' && prop.properties) {
          const value = (await ResourceController.generateMockData(prop, 1, null))[0];
          mockItem[key] = value;
        } else if (prop.type === 'relationship') {
          let parentRelationshipId = '';
          if (prop.masterDetail === true) {
            parentRelationshipId = mapOfRelationshipFieldNEndpoints[key][ResourceController.getRandomInteger(mapOfRelationshipFieldNEndpoints[key].length - 1)] || null;
          } else {
            const nullPercentage = prop.nullPercentage || 10;
            parentRelationshipId = mapOfRelationshipFieldNEndpoints[key][ResourceController.getRandomInteger(mapOfRelationshipFieldNEndpoints[key].length * (nullPercentage / 100 + 1))] || null;
          }
          mockItem[key] = parentRelationshipId;
          parentResourceIds += parentRelationshipId + ',';
        } else if (prop.type === 'array' && prop.items) {
          let itemCount = 1; // default
          if (prop.count !== undefined) {
            itemCount = prop.count;
          } else if (prop.minItems !== undefined && prop.maxItems !== undefined) {
            itemCount = faker.number.int({ min: prop.minItems, max: prop.maxItems });
          } else if (prop.minItems !== undefined) {
            itemCount = prop.minItems;
          }
          mockItem[key] = await ResourceController.generateMockData(prop.items, itemCount, seed ? seed + i : null);
        } else {
          mockItem[key] = prop.default || null;
        }
      }
    }

    data.push({ parentResourceIds, ...mockItem });
  }
  return data;
}
  static async createResource(req, res) {
    try {
      const { endpoint_id, data } = req.body;
      if (!endpoint_id || !data) {
        return res.status(400).json({ error: 'Endpoint ID and data are required' });
      }
      const endpoint = await Endpoint.findById(endpoint_id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const resource = await Resource.create({ endpoint_id, data });
      res.status(201).json(resource);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getResource(req, res) {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      res.json(resource);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getResourcesByEndpoint(req, res) {
    try {
      const resources = await Resource.findByEndpointId(req.params.endpointId);
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateResource(req, res) {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'Data is required' });
      }
      
      const endpoint = await Endpoint.findById(endpoint_id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      // const resource = await Resource.findById(req.params.id);
      // if (!resource) {
      //   return res.status(404).json({ error: 'Resource not found' });
      // }
      const updatedResource = await Resource.update(req.params.id, { data });
      res.json(updatedResource);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteResource(req, res) {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      await Resource.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ResourceController;