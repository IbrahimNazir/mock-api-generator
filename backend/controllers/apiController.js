const Api = require('../models/Api');
const Resource = require('../models/Resource');
const { generateMockData } = require('../utils/dataGenerator');

// Create a new API
exports.createApi = async (req, res) => {
  try {
    const { name, description, endpoints } = req.body;
    const userId = req.user.userId; // Get userId from authenticated user
    console.log("userId: ", userId);
    // Validate API configuration
    if (!name || !endpoints || !Array.isArray(endpoints)) {
      return res.status(400).json({ error: 'Invalid API configuration' });
    }
    // Validate endpoints
    for (const endpoint of endpoints) {
      if (!endpoint.path || !endpoint.methods || !Array.isArray(endpoint.methods)) {
        return res.status(400).json({ error: 'Invalid endpoint configuration' });
      }
      
      // Ensure methods are unique and valid
      const uniqueMethods = [...new Set(endpoint.methods)];
      if (uniqueMethods.length !== endpoint.methods.length) {
        return res.status(400).json({ error: 'Duplicate HTTP methods in endpoint' });
      }
      
      // Validate schema if provided
      if (endpoint.schema && typeof endpoint.schema !== 'object') {
        return res.status(400).json({ error: 'Invalid schema format' });
      }
    }
    
    // Create the API
    const api = await Api.create({ name, description, endpoints, userId });
    
    // Generate initial resources for each endpoint
    for (const endpoint of endpoints) {
      if (endpoint.generateInitialData && endpoint.schema) {
        const resourcePath = endpoint.path.replace(/\//g, '_');
        const data = generateMockData(
          endpoint.schema, 
          endpoint.initialCount || 10
        );
        
        await Resource.create(api.id, resourcePath, data);
      }
    }
    
    res.status(201).json(api);
  } catch (error) {
    console.error('Error creating API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all APIs
exports.getAllApis = async (req, res) => {
  try {
    const apis = await Api.findAll();
    res.json(apis);
  } catch (error) {
    console.error('Error fetching APIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific API
exports.getApiById = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    res.json(api);
  } catch (error) {
    console.error('Error fetching API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an API
exports.updateApi = async (req, res) => {
  try {
    const { name, description, endpoints } = req.body;
    
    const api = await Api.update(req.params.id, { name, description, endpoints });
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    res.json(api);
  } catch (error) {
    console.error('Error updating API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an API
exports.deleteApi = async (req, res) => {
  try {
    // Delete API and all its resources (resources are deleted by cascade)
    const api = await Api.delete(req.params.id);
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};