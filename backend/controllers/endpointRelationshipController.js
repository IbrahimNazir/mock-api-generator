const Endpoint = require('../models/Endpoint');
const Api = require('../models/Api');
const Resource = require('../models/Resource');
const ResourceController = require('./resourceController');
const EndpointRelationship = require('../models/EndpointRelationship');

class EndpointRelationshipsController {
    static validateRelationshipType(relationship_type) {
        const validTypes = ['one-to-one', 'one-to-many'];
        if (!validTypes.includes(relationship_type)) {
            throw new Error(`Invalid relationship type: ${relationship_type}. Must be one of ${validTypes.join(', ')}`);
        }
    }

    static async createRelationship(req, res) {
        try {
            const { endpoint1_id, endpoint2_id, relationship_type, is_master_detail_relationship } = req.body;
            if (!endpoint1_id || !endpoint2_id) {
                return res.status(400).json({ error: 'endpoint1_id and endpoint2_id are required' });
            }
            // Validate relationship type
            EndpointRelationshipsController.validateRelationshipType(relationship_type || 'one-to-many');

            // Fetch endpoints and check authorization
            const endpoint1 = await Endpoint.findById(endpoint1_id);
            const endpoint2 = await Endpoint.findById(endpoint2_id);

            if (!endpoint1 || !endpoint2) {
                return res.status(404).json({ error: 'One or both endpoints not found' });
            }
            const api = await Api.findById(endpoint1.api_id);
            
            if (endpoint1.api_id !== endpoint2.api_id) {
                return res.status(400).json({ error: 'Endpoints must belong to the same API' });
            }

            if (api.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Get Related relations
            const relatedRelations1 = await Resource.findByEndpointId(endpoint1_id);
            const relatedRelations2 = await Resource.findByEndpointId(endpoint2_id);



            // Delete existing resources for both endpoints
            const resource1 = await Resource.deleteByEndpointId(endpoint1_id);
            const resource2 = await Resource.deleteByEndpointId(endpoint2_id);

            // Recreate resources
            let resources1 = [];

            // Recreate resources for endpoint1
            if (endpoint1.mock_enabled && endpoint1.mock_count > 0 && endpoint1.schema) {
                const mockData1 = await ResourceController.generateMockData(endpoint1.schema, endpoint1.mock_count, endpoint1.faker_seed);
                var fakerSeed = endpoint2.faker_seed;
                for (let index = 0; index < mockData1.length; index++) {
                    const data1 = mockData1[index];
                    // Recreate resources for endpoint2 
                    let resources2 = [];
                    if (endpoint2.mock_enabled && endpoint2.mock_count > 0 && endpoint2.schema) {
                        const mockData2 = await ResourceController.generateMockData(endpoint2.schema, endpoint2.mock_count, fakerSeed);
                        fakerSeed += endpoint2.mock_count;
                        resources2 = mockData2;
                        
                        const data = { ...data1, [endpoint2.path.replace('-', '').substring(1)]: mockData2 };
                        const resource = await Resource.create({ endpoint_id: endpoint1_id, data });
                        resources1.push(resource);
                    }else {
                        const resource = await Resource.create({ endpoint_id: endpoint1_id, data:data1 });
                        resources1.push(resource);
                    }
                    if (endpoint2.mock_enabled && endpoint2.mock_count > 0 && endpoint2.schema) {
                        for (const data2 of resources2) {
                            // Creeate resource for endpoint2 with data from endpoint1
                            const lookupFieldName = endpoint1.path.replace('-','').substring(1)+ 'Id';
                            console.log("data2:", data2)
                            const data = { ...data2, [lookupFieldName]:resources1[index].id };
                            const resource = await Resource.create({ endpoint_id: endpoint2_id, data });
                        }
                    }

                }
            }
            //console.log('resources1: ',resources1)
            res.status(201).json({ endpoint1, endpoint2 });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // static async recreateRelationship(req, res) {
    //     try {
            
    //         const { endpoint1_id, endpoint2_id, relationship_type, is_master_detail_relationship } = req.body;
    //         if (!endpoint1_id || !endpoint2_id) {
    //             return res.status(400).json({ error: 'endpoint1_id and endpoint2_id are required' });
    //         }
    //         // Validate relationship type
    //         EndpointRelationshipsController.validateRelationshipType(relationship_type || 'one-to-many');

    //         // Fetch endpoints and check authorization
    //         const endpoint1 = await Endpoint.findById(endpoint1_id);
    //         const endpoint2 = await Endpoint.findById(endpoint2_id);

    //         if (!endpoint1 || !endpoint2) {
    //             return res.status(404).json({ error: 'One or both endpoints not found' });
    //         }
    //         const api = await Api.findById(endpoint1.api_id);
            
    //         if (endpoint1.api_id !== endpoint2.api_id) {
    //             return res.status(400).json({ error: 'Endpoints must belong to the same API' });
    //         }

    //         if (api.user_id !== req.user.id) {
    //             return res.status(403).json({ error: 'Unauthorized' });
    //         }

    //         // Delete existing resources for both endpoints
    //         const resource1 = await Resource.deleteByEndpointId(endpoint1_id);
    //         const resource2 = await Resource.deleteByEndpointId(endpoint2_id);

    //         // Recreate resources
    //         let resources1 = [];

    //         // Recreate resources for endpoint1
    //         if (endpoint1.mock_enabled && endpoint1.mock_count > 0 && endpoint1.schema) {
    //             const mockData1 = ResourceController.generateMockData(endpoint1.schema, endpoint1.mock_count, endpoint1.faker_seed);
    //             var fakerSeed = endpoint2.faker_seed;
    //             for (let index = 0; index < mockData1.length; index++) {
    //                 const data1 = mockData1[index];
    //                 // Recreate resources for endpoint2 
    //                 let resources2 = [];
    //                 if (endpoint2.mock_enabled && endpoint2.mock_count > 0 && endpoint2.schema) {
    //                     const mockData2 = ResourceController.generateMockData(endpoint2.schema, endpoint2.mock_count, fakerSeed);
    //                     fakerSeed += endpoint2.mock_count;
    //                     resources2 = mockData2;
    //                     const data = { ...data1, [endpoint2.path.replace('-', '').substring(1)]: mockData2 };
    //                     const resource = await Resource.create({ endpoint_id: endpoint1_id, data });
    //                     resources1.push(resource);
    //                 }else {
    //                     const resource = await Resource.create({ endpoint_id: endpoint1_id, data:data1 });
    //                     resources1.push(resource);
    //                 }
    //                 if (endpoint2.mock_enabled && endpoint2.mock_count > 0 && endpoint2.schema) {
    //                     for (const data2 of resources2) {
    //                         // Creeate resource for endpoint2 with data from endpoint1
    //                         const lookupFieldName = endpoint1.path.replace('-','').substring(1)+ 'Id';
    //                         console.log("data2:", data2)
    //                         const data = { ...data2, [lookupFieldName]:resources1[index].id };
    //                         const resource = await Resource.create({ endpoint_id: endpoint2_id, data });
    //                     }
    //                 }

    //             }
    //         }
    //         //console.log('resources1: ',resources1)
    //         res.status(201).json({ endpoint1, endpoint2 });
    //     } catch (error) {
    //         res.status(500).json({ error: error.message });
    //     }
    // }

    static async getRelationship(req, res) {
        try {
            const relationship = EndpointRelationship.findById(req.params.id);
            if (!relationship) {
                return res.status(404).json({ error: 'Relationship not found' });
            }
            const endpoint1 = await Endpoint.findById(relationship.endpoint1_id);
            const api = await Api.findById(endpoint1.api_id);
            if (!api.is_public && api.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            res.json(relationship);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getRelationshipsByEndpoint(req, res) {
        try {
            const endpoint = await Endpoint.findById(req.params.endpointId);
            if (!endpoint) {
                return res.status(404).json({ error: 'Endpoint not found' });
            }
            const api = await Api.findById(endpoint.api_id);
            if (!api.is_public && api.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            const relationships = await EndpointRelationship.findByEndpointId(endpoint.id);
            res.json(relationships);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteRelationship(req, res) {
        try {
            const relationship = await EndpointRelationship.findById(req.params.id);
            if (!relationship) {
                return res.status(404).json({ error: 'Relationship not found' });
            }
            const endpoint1 = await Endpoint.findById(relationship.rows[0].endpoint1_id);
            const api = await Api.findById(endpoint1.api_id);
            if (api.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            await EndpointRelationship.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteByEndpointId(endpoint_id) {
        try {
            const endpoint = await Endpoint.findById(endpoint_id);
            const api = await Api.findById(endpoint.api_id);
            if (api.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            await EndpointRelationship.deleteByEndpointId(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
       
}

module.exports = EndpointRelationshipsController;