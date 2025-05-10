const Api = require('../models/Api');
const Resource = require('../models/Resource');
const { v4: uuidv4 } = require('uuid');
const { buildWhereClause, buildSortClause, buildPaginationClause } = require('../utils/queryBuilder');
const { generateMockData } = require('../utils/dataGenerator');
const db = require('../config/db');

// Handle dynamic mock API requests
exports.handleMockRequest = async (req, res) => {
  try {
    const { apiId } = req.params;
    const path = req.params[0] || '/';
    const method = req.method.toLowerCase();
    
    // Find the API
    const api = await Api.findById(apiId);
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    // Find the matching endpoint
    const endpoint = api.endpoints.find(e => {
      const endpointPath = e.path.startsWith('/') ? e.path.slice(1) : e.path;
      const requestPath = path.startsWith('/') ? path.slice(1) : path;
      
      // Check if paths match and methods match (or endpoint supports all methods)
      return endpointPath === requestPath && 
             (e.methods.includes(method) || e.methods.includes('*'));
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const resourcePath = endpoint.path.replace(/\//g, '_');
    
    // Process request based on HTTP method
    switch (method) {
      case 'get':
        await handleGetRequest(req, res, apiId, resourcePath, endpoint);
        break;
      case 'post':
        await handlePostRequest(req, res, apiId, resourcePath, endpoint);
        break;
      case 'put':
        await handlePutRequest(req, res, apiId, resourcePath, endpoint);
        break;
      case 'patch':
        await handlePatchRequest(req, res, apiId, resourcePath, endpoint);
        break;
      case 'delete':
        await handleDeleteRequest(req, res, apiId, resourcePath, endpoint);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling mock request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle GET requests
const handleGetRequest = async (req, res, apiId, resourcePath, endpoint) => {
  try {
    const resource = await Resource.findByApiAndPath(apiId, resourcePath);
    
    if (!resource) {
      // Generate data if endpoint has schema
      if (endpoint.schema) {
        const data = generateMockData(endpoint.schema, 10);
        await Resource.create(apiId, resourcePath, data);
        
        if (req.query.id) {
          const item = data.find(item => item.id === req.query.id);
          return res.json(item || { error: 'Item not found' });
        }
        
        return res.json(data);
      }
      
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const data = resource.data;
    
    // Handle ID parameter for single item
    if (req.query.id) {
      const item = data.find(item => item.id === req.query.id);
      return res.json(item || { error: 'Item not found' });
    }
    
    // Handle filtering
    let filteredData = [...data];
    const filters = { ...req.query };
    
    // Remove pagination and sorting params from filters
    delete filters._page;
    delete filters._limit;
    delete filters._sort;
    delete filters._order;
    
    if (Object.keys(filters).length > 0) {
      filteredData = data.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          return String(item[key]) === String(value);
        });
      });
    }
    
    // Handle sorting
    if (req.query._sort) {
      const sortField = req.query._sort;
      const sortOrder = req.query._order === 'desc' ? -1 : 1;
      
      filteredData.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * sortOrder;
        if (a[sortField] > b[sortField]) return 1 * sortOrder;
        return 0;
      });
    }
    
    // Handle pagination
    const page = parseInt(req.query._page) || 1;
    const limit = parseInt(req.query._limit) || filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    // Set pagination headers
    res.set('X-Total-Count', filteredData.length.toString());
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    
    res.json(paginatedData);
  } catch (error) {
    console.error('Error handling GET request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle POST requests
const handlePostRequest = async (req, res, apiId, resourcePath, endpoint) => {
  try {
    const resource = await Resource.findByApiAndPath(apiId, resourcePath);
    let data = [];
    
    if (resource) {
      data = resource.data;
    } else if (endpoint.schema) {
      // Generate initial data if not exists
      data = generateMockData(endpoint.schema, 0);
    }
    
    // Create new item
    const newItem = {
      id: req.body.id || uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    data.push(newItem);
    
    // Update resource
    await Resource.create(apiId, resourcePath, data);
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error handling POST request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle PUT requests
const handlePutRequest = async (req, res, apiId, resourcePath, endpoint) => {
  try {
    const resource = await Resource.findByApiAndPath(apiId, resourcePath);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const data = resource.data;
    const itemId = req.query.id;
    
    if (!itemId) {
      return res.status(400).json({ error: 'ID parameter is required' });
    }
    
    // Find item index
    const itemIndex = data.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update item
    const updatedItem = {
      ...req.body,
      id: itemId,
      updatedAt: new Date().toISOString()
    };
    
    data[itemIndex] = updatedItem;
    
    // Update resource
    await Resource.update(apiId, resourcePath, data);
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error handling PUT request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle PATCH requests
const handlePatchRequest = async (req, res, apiId, resourcePath, endpoint) => {
  try {
    const resource = await Resource.findByApiAndPath(apiId, resourcePath);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const data = resource.data;
    const itemId = req.query.id;
    
    if (!itemId) {
      return res.status(400).json({ error: 'ID parameter is required' });
    }
    
    // Find item index
    const itemIndex = data.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update item (partial)
    const updatedItem = {
      ...data[itemIndex],
      ...req.body,
      id: itemId,
      updatedAt: new Date().toISOString()
    };
    
    data[itemIndex] = updatedItem;
    
    // Update resource
    await Resource.update(apiId, resourcePath, data);
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error handling PATCH request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle DELETE requests
const handleDeleteRequest = async (req, res, apiId, resourcePath, endpoint) => {
  try {
    const resource = await Resource.findByApiAndPath(apiId, resourcePath);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const data = resource.data;
    const itemId = req.query.id;
    
    if (!itemId) {
      return res.status(400).json({ error: 'ID parameter is required' });
    }
    
    // Find item index
    const itemIndex = data.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Remove item
    const deletedItem = data[itemIndex];
    data.splice(itemIndex, 1);
    
    // Update resource
    await Resource.update(apiId, resourcePath, data);
    
    res.status(200).json(deletedItem);
  } catch (error) {
    console.error('Error handling DELETE request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
