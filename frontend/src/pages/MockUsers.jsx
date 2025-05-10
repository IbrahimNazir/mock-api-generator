import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MockUserList from '../components/MockUserList';
import MockUserForm from '../components/MockUserForm';
import { getMockUsers, createMockUser } from '../services/api';

function MockUsers() {
  const { apiId } = useParams();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await getMockUsers(apiId);
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [apiId]);

  const handleCreate = async (data) => {
    try {
      await createMockUser(apiId, data);
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      console.error('Create failed:', err);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Mock Users for API {apiId}</h1>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        {showForm ? 'Cancel' : 'Create New User'}
      </button>
      {showForm && <MockUserForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      <MockUserList users={users} apiId={apiId} onUpdate={fetchUsers} />
    </div>
  );
}

export default MockUsers;