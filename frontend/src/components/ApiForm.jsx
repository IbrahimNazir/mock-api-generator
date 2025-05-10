import { useState } from 'react';
import EndpointForm from './EndpointForm';
import Modal from './Modal';
import ErrorBoundary from './ErrorBoundary';

function ApiForm({ initialData = {}, onSubmit, onCancel }) {
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [endpoints, setEndpoints] = useState(initialData.config?.endpoints || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);

  const handleAddEndpoint = (endpoint) => {
    console.log('Adding endpoint:', endpoint);
    setEndpoints([...endpoints, endpoint]);
    setIsModalOpen(false);
  };

  const handleEditEndpoint = (endpoint, index) => {
    console.log('Editing endpoint:', endpoint, 'Index:', index);
    const updatedEndpoints = [...endpoints];
    updatedEndpoints[index] = endpoint;
    setEndpoints(updatedEndpoints);
    setIsModalOpen(false);
    setEditingEndpoint(null);
  };

  const handleDeleteEndpoint = (index) => {
    if (window.confirm('Are you sure you want to delete this endpoint?')) {
      setEndpoints(endpoints.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (endpoints.length === 0) {
      alert('At least one endpoint is required.');
      return;
    }
    const apiData = { name, description, endpoints };
    console.log('Submitting API:', apiData);
    onSubmit(apiData);
  };

  return (
    <ErrorBoundary>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-bold mb-4">{initialData.id ? 'Edit API' : 'Create API'}</h2>
        <div className="mb-4">
          <label className="block text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Endpoints</h3>
          {endpoints.length === 0 ? (
            <p className="text-gray-500">No endpoints added yet.</p>
          ) : (
            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="border p-4 rounded bg-gray-50">
                  <h4 className="font-medium">{endpoint.path}</h4>
                  <p className="text-sm text-gray-600">
                    Methods: {endpoint.methods.join(', ')}
                  </p>
                  <p className="text-sm text-gray-600">
                    Generate Initial Data: {endpoint.generateInitialData ? 'Yes' : 'No'} (
                    {endpoint.initialCount} records)
                  </p>
                  <p className="text-sm text-gray-600">
                    Schema: {Object.keys(endpoint.schema).join(', ')}
                  </p>
                  <div className="mt-2 space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEndpoint({ ...endpoint, index });
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEndpoint(index)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setEditingEndpoint({});
              setIsModalOpen(true);
            }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Endpoint
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            {initialData.id ? 'Update' : 'Create'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 p-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>

        <ErrorBoundary>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <EndpointForm
              initialData={editingEndpoint || {}}
              onSubmit={(endpoint) =>
                editingEndpoint?.index !== undefined
                  ? handleEditEndpoint(endpoint, editingEndpoint.index)
                  : handleAddEndpoint(endpoint)
              }
            />
          </Modal>
        </ErrorBoundary>
      </form>
    </ErrorBoundary>
  );
}

export default ApiForm;