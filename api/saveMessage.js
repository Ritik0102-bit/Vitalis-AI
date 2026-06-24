const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, session_id, sender, text } = req.body;

  if (!user_id || !session_id || !sender || text === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    
    // Create messages table if it doesn't exist
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

    // Insert message
    const query = `
      INSERT INTO messages (user_id, session_id, sender, text) 
      VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await client.query(query, [user_id, session_id, sender, text]);
    client.release();

    res.status(200).json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
