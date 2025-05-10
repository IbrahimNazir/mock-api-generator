import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../services/auth';

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        setProfile(response.data);
        setUsername(response.data.username);
        setEmail(response.data.email);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile.');
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = {};
      if (username) data.username = username;
      if (email) data.email = email;
      if (password) data.password = password;
      await updateProfile(data);
      setProfile({ ...profile, username, email });
      setPassword('');
      setError('');
    } catch (err) {
        console.error('Failed to update profile:', err);
      setError('Failed to update profile.');
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded shadow-md max-w-md">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleUpdate}>
          <div className="mb-4">
            <label className="block text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}

export default Dashboard;