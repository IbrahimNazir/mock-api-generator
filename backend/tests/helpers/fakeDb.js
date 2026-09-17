/**
 * Minimal in-memory stand-in for db/db.js so route-level tests can run
 * without PostgreSQL. It recognises the handful of SQL shapes the mock
 * router issues and answers them from plain arrays.
 *
 * Must be installed BEFORE any model is required.
 */
const path = require('path');
const crypto = require('crypto');

function install(seed = {}) {
  const state = {
    users: seed.users || [],
    apis: seed.apis || [],
    endpoints: seed.endpoints || [],
    resources: seed.resources || [],
  };

  async function query(text, params = []) {
    const sql = text.replace(/\s+/g, ' ').trim();

    if (/^SELECT a\.\* FROM apis a JOIN users u ON a\.user_id = u\.id WHERE u\.username = \$1 AND a\.base_path = \$2/i.test(sql)) {
      const user = state.users.find(u => u.username === params[0]);
      const rows = user ? state.apis.filter(a => a.user_id === user.id && a.base_path === params[1]) : [];
      return { rows, rowCount: rows.length };
    }
    if (/^SELECT \* FROM endpoints WHERE api_id = \$1 AND path = \$2 AND \$3 = ANY\(methods\)/i.test(sql)) {
      const rows = state.endpoints.filter(e => e.api_id === params[0] && e.path === params[1] && e.methods.includes(params[2]));
      return { rows, rowCount: rows.length };
    }
    if (/^SELECT \* FROM resources WHERE endpoint_id = \$1 ORDER BY created_at DESC, id DESC/i.test(sql)) {
      const rows = state.resources
        .filter(r => r.endpoint_id === params[0])
        .sort((a, b) => (b.created_at - a.created_at) || (b.id < a.id ? -1 : b.id > a.id ? 1 : 0));
      return { rows, rowCount: rows.length };
    }
    if (/^SELECT \* FROM resources WHERE id = \$1/i.test(sql)) {
      const rows = state.resources.filter(r => r.id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (/^INSERT INTO resources/i.test(sql)) {
      const row = {
        id: crypto.randomUUID(), endpoint_id: params[0], parent_resource_ids: params[1],
        data: JSON.parse(params[2]), created_at: new Date(), updated_at: new Date(),
      };
      state.resources.push(row);
      return { rows: [row], rowCount: 1 };
    }
    if (/^UPDATE resources SET data = COALESCE\(\$1, data\)/i.test(sql)) {
      const row = state.resources.find(r => r.id === params[1]);
      if (!row) return { rows: [], rowCount: 0 };
      if (params[0] !== null) row.data = JSON.parse(params[0]);
      row.updated_at = new Date(row.updated_at.getTime() + 1000);
      return { rows: [row], rowCount: 1 };
    }
    if (/^DELETE FROM resources WHERE id = \$1/i.test(sql)) {
      const idx = state.resources.findIndex(r => r.id === params[0]);
      if (idx === -1) return { rows: [], rowCount: 0 };
      const [row] = state.resources.splice(idx, 1);
      return { rows: [row], rowCount: 1 };
    }
    if (/^SELECT (\*|id, username, email, role, is_active, created_at, updated_at) FROM users WHERE id = \$1/i.test(sql)) {
      const rows = state.users.filter(u => u.id === params[0]);
      return { rows, rowCount: rows.length };
    }
    throw new Error(`fakeDb: unhandled SQL: ${sql}`);
  }

  const fake = {
    query,
    pool: { connect: async () => ({ query, release() {} }), query },
    state,
  };
  const dbPath = path.resolve(__dirname, '../../db/db.js');
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fake };
  return fake;
}

module.exports = { install };
