const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, name, email, age, gender } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        age INTEGER,
        gender VARCHAR(50)
      );
    `);

    // Upsert user
    const query = `
      INSERT INTO users (id, name, email, age, gender) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, 
          email = EXCLUDED.email, 
          age = EXCLUDED.age, 
          gender = EXCLUDED.gender;
    `;
    await client.query(query, [id, name, email, age, gender]);
    client.release();

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
