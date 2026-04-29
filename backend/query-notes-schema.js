const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'password', database: 'myapp' });
(async () => {
  try {
    await client.connect();
    const q = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notes'
      ORDER BY ordinal_position;
    `;
    const res = await client.query(q);
    console.table(res.rows);
    console.log(`\nTotal columns: ${res.rows.length} (expect 12)`);
  } catch (e) {
    console.error('QUERY_ERROR_OBJECT:', JSON.stringify({message: e.message, code: e.code, errno: e.errno, syscall: e.syscall, address: e.address, port: e.port}, null, 2));
    console.error('QUERY_ERROR_RAW:', e);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch {}
  }
})();
