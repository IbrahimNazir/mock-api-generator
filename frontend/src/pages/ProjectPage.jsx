import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import api from '../utils/api.js';

const ProjectPage = () => {
  const [apis, setApis] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', base_path: '', description: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    api.get('/users/apis', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setApis(response.data));
  }, [token]);

  const createAPI = () => {
    api.post('/apis', {
      name: form.name,
      version: '1.0.0',
      base_path: form.base_path || '/newapi',
      description: 'New API',
      is_public: true,
    }, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        setApis([...apis, response.data]);
        setIsModalOpen(false);
        setForm({ name: '', base_path: '' });
      });
  };

  const viewResources = (apiId) => navigate(`/resources/${apiId}`);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Projects</h1>
      <Button label="New Project" onClick={() => setIsModalOpen(true)} className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apis.map(api => (
          <div key={api.id} className="p-4 bg-white rounded-lg shadow cursor-pointer" onClick={() => viewResources(api.id)}>
            <h2 className="text-xl font-semibold">{api.name}</h2>
            <p>Version: {api.version}</p>
            <p>Path: {api.base_path}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Example: Todo App, Project X..."
                  className="mt-1 p-2 w-full border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">API Prefix</label>
                <input
                  type="text"
                  value={form.base_path}
                  onChange={e => setForm({ ...form, base_path: e.target.value })}
                  placeholder="Example: /api"
                  className="mt-1 p-2 w-full border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Add API prefix to all endpoints in this project.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Example: /api"
                  className="mt-1 p-2 w-full border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Add description of the Project</p>
              </div>
              <div className="flex justify-end space-x-4 mt-4">
                <Button label="Cancel" onClick={() => setIsModalOpen(false)} className="bg-gray-300 text-black" />
                <Button label="Create" onClick={createAPI} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPage;