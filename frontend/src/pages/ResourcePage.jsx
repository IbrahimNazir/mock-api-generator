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

  const formatJson = () => {
    try {
      const parsed = JSON.parse(form.schema);
      const formatted = JSON.stringify(parsed, null, 2);
      setForm(prev => ({ ...prev, schema: formatted }));
    } catch (e) {
      alert('Invalid JSON. Please correct the syntax.');
    }
  };

  const handleSchemaChange = (e) => {
    setForm(prev => ({ ...prev, schema: e.target.value }));
  };

  const createResource = () => {
    try {
      const schema = JSON.parse(form.schema);
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
    } catch (e) {
      alert('Invalid JSON schema. Please ensure it is valid JSON.');
    }
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
                <label className="block text-sm font-medium text-gray-700">Schema (JSON)</label>
                <p className="text-xs text-gray-500 mt-1">Enter schema as JSON. Use the button to format.</p>
                <textarea
                  value={form.schema}
                  onChange={handleSchemaChange}
                  placeholder='{"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}'
                  className="mt-1 p-2 w-full border rounded h-40 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={formatJson}
                  className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Format JSON
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