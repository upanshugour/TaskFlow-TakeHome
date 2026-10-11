import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = Number.parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  try {
    await connectDB();
  } catch {
    console.error('MongoDB connection failed; API server was not started.');
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`TaskFlow API listening on port ${port}`);
  });

  server.on('error', (error) => {
    console.error('HTTP server failed to start:', error.message);
    process.exitCode = 1;
  });
}

startServer();
