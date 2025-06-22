import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import api from '../utils/api';

const ResourcePage = () => {
  const { apiId } = useParams();
  const [resources, setResources] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    api_id: apiId,
    path: '',
    methods: ['GET'],
    description: '',
    mock_enabled: true,
    mock_count: 2,
    faker_seed: 123,
    schema: { type: 'object', properties: {}, required: [] },
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    api.get(`/endpoints/api/${apiId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setResources(response.data || []));
  }, [apiId, token]);

  const addProperty = (parentPath = '') => {
    const newField = {
      name: `newField${Date.now()}`, // Temporary unique key
      type: 'string',
      default: '',
      faker: '',
      minLength: '',
      maxLength: '',
      minimum: '',
      maximum: '',
      required: false,
      properties: {}, // Ensure nested properties are initialized
    };
    setForm(prev => {
      const properties = { ...prev.schema.properties };
      const fullPath = parentPath ? `${parentPath}.${newField.name}` : newField.name;
      if (parentPath) {
        const parentKeys = parentPath.split('.');
        let current = properties;
        for (let i = 0; i < parentKeys.length; i++) {
          current = current[parentKeys[i]].properties || (current[parentKeys[i]] = { properties: {} }).properties;
        }
        current[newField.name] = newField;
      } else {
        properties[newField.name] = newField;
      }
      return {
        ...prev,
        schema: { ...prev.schema, properties },
      };
    });
  };

  const updateProperty = (path, updates) => {
    setForm(prev => {
      const properties = { ...prev.schema.properties };
      const keys = path.split('.');
      let current = properties;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]].properties || (current[keys[i]] = { properties: {} }).properties;
      }
      const fieldName = keys[keys.length - 1];
      current[fieldName] = { ...current[fieldName], ...updates, properties: current[fieldName]?.properties || {} };
      return {
        ...prev,
        schema: { ...prev.schema, properties },
      };
    });
  };

  const toggleRequired = (path) => {
    setForm(prev => {
      const required = prev.schema.required.includes(path)
        ? prev.schema.required.filter(p => p !== path)
        : [...prev.schema.required, path];
      return { ...prev, schema: { ...prev.schema, required } };
    });
  };

  const removeProperty = (path) => {
    setForm(prev => {
      const properties = { ...prev.schema.properties };
      const keys = path.split('.');
      let current = properties;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]].properties || {};
      }
      delete current[keys[keys.length - 1]];
      return { ...prev, schema: { ...prev.schema, properties } };
    });
  };

  const createResource = () => {
    const schema = {
      type: 'object',
      properties: form.schema.properties,
      required: form.schema.required,
    };
    api.post('/endpoints', { ...form, schema }, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        setResources([...resources, response.data.resources[0]]);
        setIsModalOpen(false);
        setForm({
          api_id: apiId,
          path: '',
          methods: ['GET'],
          description: '',
          mock_enabled: true,
          mock_count: 2,
          faker_seed: 123,
          schema: { type: 'object', properties: {}, required: [] },
        });
      })
      .catch(error => console.error('Error creating resource:', error));
  };

  const renderSchemaEditor = (properties, parentPath = '') => {
    return Object.entries(properties).map(([key, field]) => {
      const fullPath = parentPath ? `${parentPath}.${key}` : key;
      return (
        <div key={fullPath} className="flex flex-col space-y-2 mt-2 p-2 border rounded bg-gray-50">
          <div className="flex space-x-2 items-center">
            <input
              type="text"
              value={field.name || key}
              onChange={e => updateProperty(fullPath, { name: e.target.value })}
              placeholder="Field name"
              className="p-2 border rounded w-1/4"
            />
            <select
              value={field.type}
              onChange={e => updateProperty(fullPath, { type: e.target.value })}
              className="p-2 border rounded w-1/6"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="object">Object</option>
              <option value="array">Array</option>
            </select>
            <input
              type="checkbox"
              checked={form.schema.required.includes(fullPath)}
              onChange={() => toggleRequired(fullPath)}
              className="p-2"
            />
            <label className="text-sm text-gray-600">Required</label>
            <button
              onClick={() => removeProperty(fullPath)}
              className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
          {showAdvanced && (
            <div className="flex space-x-2 mt-2">
              <input
                type={field.type === 'string' ? 'text' : 'number'}
                value={field.default || ''}
                onChange={e => updateProperty(fullPath, { default: e.target.value })}
                placeholder="Default"
                className="p-2 border rounded w-1/6"
              />
              <input
                type="text"
                value={field.faker || ''}
                onChange={e => updateProperty(fullPath, { faker: e.target.value })}
                placeholder="Faker (e.g., name.fullName)"
                className="p-2 border rounded w-1/6"
              />
              {field.type === 'string' && (
                <>
                  <input
                    type="number"
                    value={field.minLength || ''}
                    onChange={e => updateProperty(fullPath, { minLength: e.target.value })}
                    placeholder="Min Length"
                    className="p-2 border rounded w-1/12"
                  />
                  <input
                    type="number"
                    value={field.maxLength || ''}
                    onChange={e => updateProperty(fullPath, { maxLength: e.target.value })}
                    placeholder="Max Length"
                    className="p-2 border rounded w-1/12"
                  />
                </>
              )}
              {field.type === 'number' && (
                <>
                  <input
                    type="number"
                    value={field.minimum || ''}
                    onChange={e => updateProperty(fullPath, { minimum: e.target.value })}
                    placeholder="Min"
                    className="p-2 border rounded w-1/12"
                  />
                  <input
                    type="number"
                    value={field.maximum || ''}
                    onChange={e => updateProperty(fullPath, { maximum: e.target.value })}
                    placeholder="Max"
                    className="p-2 border rounded w-1/12"
                  />
                </>
              )}
            </div>
          )}
          {['object', 'array'].includes(field.type) && (
            <div className="ml-4 mt-2">
              <button
                onClick={() => addProperty(fullPath)}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Nested Property
              </button>
              {renderSchemaEditor(field.properties || {}, fullPath)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Resources</h1>
      <Button label="New Resource" onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-500 text-white hover:bg-blue-600" />
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.length === 0 ? (
          <p className="text-gray-500">No resources yet...</p>
        ) : (
          resources.map(resource => (
            <div key={resource.id} className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold">{resource.path}</h2>
              <p>Methods: {resource.methods.join(', ')}</p>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">New Resource</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource name</label>
                <input
                  type="text"
                  value={form.path}
                  onChange={e => setForm({ ...form, path: e.target.value })}
                  placeholder="Example: users, comments, articles..."
                  className="mt-1 p-2 w-full border rounded focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a meaningful name; it will generate the API endpoint.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Methods</label>
                <select
                  multiple
                  value={form.methods}
                  onChange={e => setForm({ ...form, methods: Array.from(e.target.selectedOptions, option => option.value) })}
                  className="mt-1 p-2 w-full border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Manage user profiles"
                  className="mt-1 p-2 w-full border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mock Settings</label>
                <div className="flex space-x-4 mt-1">
                  <input
                    type="checkbox"
                    checked={form.mock_enabled}
                    onChange={e => setForm({ ...form, mock_enabled: e.target.checked })}
                    className="p-2"
                  />
                  <label>Mock Enabled</label>
                  <input
                    type="number"
                    value={form.mock_count}
                    onChange={e => setForm({ ...form, mock_count: e.target.value })}
                    placeholder="Mock Count"
                    className="p-2 border rounded w-1/4 focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={form.faker_seed}
                    onChange={e => setForm({ ...form, faker_seed: e.target.value })}
                    placeholder="Faker Seed"
                    className="p-2 border rounded w-1/4 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Schema</label>
                <p className="text-xs text-gray-500 mt-1">Define the resource schema for mock data generation.</p>
                <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
                  {renderSchemaEditor(form.schema.properties)}
                  <button
                    onClick={() => addProperty()}
                    className="mt-2 p-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Add Property
                  </button>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mt-2 p-2 text-blue-500 hover:underline"
                >
                  {showAdvanced ? 'Show Less' : 'Show More'}
                </button>
              </div>
              <div className="flex justify-end space-x-4 mt-4">
                <Button label="Close" onClick={() => setIsModalOpen(false)} className="bg-gray-300 text-black hover:bg-gray-400" />
                <Button label="Create" onClick={createResource} className="bg-blue-500 text-white hover:bg-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcePage;