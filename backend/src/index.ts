import { app } from './app';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`⚡ VoltShare backend API server running at http://localhost:${PORT}`);
  console.log(`🔌 Connected to Postgres at: ${process.env.DATABASE_URL || 'localhost:5432'}`);
});
