import { revokeSession, revokeAllSessions } from '../services/auth';

function SessionList({ sessions, onUpdate }) {
  const handleRevoke = async (sessionId) => {
    if (window.confirm('Are you sure you want to revoke this session?')) {
      try {
        await revokeSession(sessionId);
        onUpdate();
      } catch (err) {
        console.error('Revoke failed:', err);
      }
    }
  };

  const handleRevokeAll = async () => {
    if (window.confirm('Are you sure you want to revoke all other sessions?')) {
      try {
        await revokeAllSessions();
        onUpdate();
      } catch (err) {
        console.error('Revoke all failed:', err);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Active Sessions</h2>
      <button
        onClick={handleRevokeAll}
        className="mb-4 bg-red-500 text-white p-2 rounded hover:bg-red-600"
      >
        Revoke All Other Sessions
      </button>
      {sessions.length === 0 ? (
        <p className="text-gray-500">No active sessions.</p>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white p-4 rounded shadow-md">
              <p className="text-gray-600">User Agent: {session.user_agent}</p>
              <p className="text-gray-600">IP: {session.ip_address}</p>
              <p className="text-gray-600">
                Expires: {new Date(session.expires_at).toLocaleString()}
              </p>
              <button
                onClick={() => handleRevoke(session.id)}
                className="mt-2 text-red-600 hover:underline"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SessionList;