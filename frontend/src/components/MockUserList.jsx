import { useState } from 'react';
import MockUserForm from './MockUserForm';
import { updateMockUser, deleteMockUser } from '../services/api';

function MockUserList({ users, apiId, onUpdate }) {
  const [editingUser, setEditingUser] = useState(null);

  const handleUpdate = async (id, data) => {
    try {
      await updateMockUser(apiId, id, data);
      setEditingUser(null);
      onUpdate();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteMockUser(apiId, id);
        onUpdate();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Mock Users</h2>
      {users.length === 0 ? (
        <p className="text-gray-500">No users created yet.</p>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white p-4 rounded shadow-md">
              {editingUser && editingUser.id === user.id ? (
                <MockUserForm
                  initialData={user}
                  onSubmit={(data) => handleUpdate(user.id, data)}
                  onCancel={() => setEditingUser(null)}
                />
              ) : (
                <>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-gray-600">Email: {user.email}</p>
                  <p className="text-gray-600">Age: {user.age}</p>
                  <p className="text-gray-600">Active: {user.isActive ? 'Yes' : 'No'}</p>
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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

export default MockUserList;