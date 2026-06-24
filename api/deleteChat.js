const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, session_id } = req.body;

  if (!user_id || !session_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    
    // Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        session_name VARCHAR(255),
        sender VARCHAR(50),
        text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);`);

    let result;
    if (session_id === 'legacy_null') {
        result = await client.query(
            'DELETE FROM messages WHERE user_id = $1 AND session_id IS NULL RETURNING id',
            [user_id]
        );
    } else {
        result = await client.query(
            'DELETE FROM messages WHERE user_id = $1 AND session_id = $2 RETURNING id',
            [user_id, session_id]
        );
    }
    
    client.release();
    res.status(200).json({ success: true, deletedRows: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
