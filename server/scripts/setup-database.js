const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to postgres database first
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const dbName = process.env.DB_NAME || 'cv_improv';

  try {
    console.log('🔧 Setting up database...');

    // Check if database exists
    const dbCheckResult = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbCheckResult.rows.length === 0) {
      // Create database
      console.log(`📦 Creating database: ${dbName}`);
      await pool.query(`CREATE DATABASE ${dbName}`);
    } else {
      console.log(`✅ Database ${dbName} already exists`);
    }

    // Close connection to postgres database
    await pool.end();

    // Connect to our application database
    const appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Executing database schema...');
    await appPool.query(schemaSql);

    // Verify setup by checking if tables exist
    const tablesResult = await appPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('✅ Database setup completed successfully!');
    console.log('📊 Created tables:', tablesResult.rows.map(row => row.table_name).join(', '));

    // Insert some test data if in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🌱 Inserting development seed data...');
      
      // Additional template data
      await appPool.query(`
        INSERT INTO templates (name, description, template_data) VALUES 
        ('Executive Classic', 'Traditional format for senior positions and executives', '{
          "sections": ["header", "executive_summary", "experience", "education", "skills", "achievements"],
          "styling": {
            "font": "Times New Roman",
            "fontSize": 12,
            "margins": {"top": 25, "bottom": 25, "left": 25, "right": 25},
            "colors": {"primary": "#1a1a1a", "secondary": "#333333", "text": "#000000"}
          }
        }'),
        ('Creative Modern', 'Contemporary design for creative and tech professionals', '{
          "sections": ["header", "summary", "skills", "experience", "projects", "education"],
          "styling": {
            "font": "Helvetica",
            "fontSize": 10.5,
            "margins": {"top": 15, "bottom": 15, "left": 15, "right": 15},
            "colors": {"primary": "#3498db", "secondary": "#2c3e50", "text": "#2c3e50"}
          }
        }')
        ON CONFLICT DO NOTHING
      `);

      console.log('✅ Seed data inserted successfully!');
    }

    await appPool.end();

    console.log(`
🎉 Database setup complete!

Database: ${dbName}
Host: ${process.env.DB_HOST || 'localhost'}
Port: ${process.env.DB_PORT || 5432}

You can now start the server with: npm run dev
    `);

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;