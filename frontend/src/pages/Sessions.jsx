import { useState, useEffect } from 'react';
import SessionList from '../components/SessionList';
import { getSessions } from '../services/auth';

function Sessions() {
  const [sessions, setSessions] = useState([]);

  const fetchSessions = async () => {
    try {
      const response = await getSessions();
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Active Sessions</h1>
      <SessionList sessions={sessions} onUpdate={fetchSessions} />
    </div>
  );
}

export default Sessions;