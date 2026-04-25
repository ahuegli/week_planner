const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'password', database: 'myapp' });
(async () => {
  try {
    await client.connect();
    const q = 'SELECT "sessionType", "intensity", "cyclePhaseRules" FROM planned_sessions WHERE "cyclePhaseRules" IS NOT NULL LIMIT 5;';
    const res = await client.query(q);
    console.table(res.rows);
  } catch (e) {
    console.error('QUERY_ERROR_OBJECT:', JSON.stringify({message: e.message, code: e.code, errno: e.errno, syscall: e.syscall, address: e.address, port: e.port}, null, 2));
    console.error('QUERY_ERROR_RAW:', e);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch {}
  }
})();
