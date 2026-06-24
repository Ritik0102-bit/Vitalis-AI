const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, session_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const client = await pool.connect();
    
    // Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        sender VARCHAR(50),
        text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure session_id column exists for old tables
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);`);

    // Ensure session_name column exists for renaming feature
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_name VARCHAR(255);`);

    if (session_id) {
      let result;
      if (session_id === 'legacy_null') {
        // Fetch messages for legacy session
        result = await client.query(
          'SELECT * FROM messages WHERE user_id = $1 AND session_id IS NULL ORDER BY created_at ASC', 
          [user_id]
        );
      } else {
        // Fetch messages for a specific session
        result = await client.query(
          'SELECT * FROM messages WHERE user_id = $1 AND session_id = $2 ORDER BY created_at ASC', 
          [user_id, session_id]
        );
      }
      client.release();
      res.status(200).json(result.rows);
    } else {
      // Fetch list of sessions (unique session_ids)
      const query = `
        SELECT DISTINCT ON (COALESCE(session_id, 'legacy_null')) 
          COALESCE(session_id, 'legacy_null') as session_id, 
          COALESCE(session_name, text) as title, 
          created_at
        FROM messages
        WHERE user_id = $1 AND sender = 'user'
        ORDER BY COALESCE(session_id, 'legacy_null'), created_at ASC
      `;
      const result = await client.query(query, [user_id]);
      client.release();
      
      // Sort sessions by newest first
      const sessions = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.status(200).json(sessions);
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
