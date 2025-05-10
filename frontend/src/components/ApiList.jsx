import { useState } from 'react';
import { Link } from 'react-router-dom';
import ApiForm from './ApiForm';
import { updateApi, deleteApi } from '../services/api';

function ApiList({ apis, onUpdate }) {
  const [editingApi, setEditingApi] = useState(null);

  const handleUpdate = async (apiId, data) => {
    try {
      await updateApi(apiId, data);
      setEditingApi(null);
      onUpdate();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleDelete = async (apiId) => {
    if (window.confirm('Are you sure you want to delete this API?')) {
      try {
        await deleteApi(apiId);
        onUpdate();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Your APIs</h2>
      {apis.length === 0 ? (
        <p className="text-gray-500">No APIs created yet.</p>
      ) : (
        <div className="grid gap-4">
          {apis.map((api) => (
            <div key={api.id} className="bg-white p-4 rounded shadow-md">
              {editingApi && editingApi.id === api.id ? (
                <ApiForm
                  initialData={api}
                  onSubmit={(data) => handleUpdate(api.id, data)}
                  onCancel={() => setEditingApi(null)}
                />
              ) : (
                <>
                  <h3 className="text-xl font-semibold">{api.name}</h3>
                  <p className="text-gray-600">{api.description}</p>
                  <p className="text-sm text-gray-500">
                    Endpoints: {api.endpoints.map((e) => e.path).join(', ')}
                  </p>
                  <div className="mt-2 space-x-2">
                    <Link
                      to={`/mock/${api.id}/users`}
                      className="text-blue-600 hover:underline"
                    >
                      View Mock Users
                    </Link>
                    <button
                      onClick={() => setEditingApi(api)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(api.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApiList;