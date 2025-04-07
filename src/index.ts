import { App } from './app';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure runtime
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the process running but log the error
});

// Start the application
const PORT = parseInt(process.env.PORT || '8080', 10);
const app = new App(PORT);
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});