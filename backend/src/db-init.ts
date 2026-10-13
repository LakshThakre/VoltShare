import fs from 'fs';
import path from 'path';
import { pool } from './db';

export async function initDatabase() {
  console.log('Initializing VoltShare database schema...');
  const schemaDir = path.resolve(__dirname, '../../sql/schema');
  const files = fs.readdirSync(schemaDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    console.log(`Executing SQL script: ${file}`);
    const sql = fs.readFileSync(path.join(schemaDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`✓ Applied: ${file}`);
  }

  console.log('VoltShare database successfully initialized!');
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}
