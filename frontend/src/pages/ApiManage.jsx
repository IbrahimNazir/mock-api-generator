import { useState, useEffect } from 'react';
import ApiList from '../components/ApiList';
import ApiForm from '../components/ApiForm';
import { getApis, createApi } from '../services/api';

function ApiManage() {
  const [apis, setApis] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const fetchApis = async () => {
    try {
      const response = await getApis();
      console.log("response.data: ", response.data);
      setApis(response.data);
    } catch (err) {
      console.error('Failed to fetch APIs:', err);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleCreate = async (data) => {
    try {
      await createApi(data);
      setShowForm(false);
      fetchApis();
    } catch (err) {
      console.error('Create failed:', err);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Manage APIs</h1>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        {showForm ? 'Cancel' : 'Create New API'}
      </button>
      {showForm && <ApiForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      <ApiList apis={apis} onUpdate={fetchApis} />
    </div>
  );
}

export default ApiManage;