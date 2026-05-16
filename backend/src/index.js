import { config } from './config.js';
import { createApp } from './server.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`chama-resolve-api listening on http://localhost:${config.port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${config.port} is already in use. Stop the existing backend server or run with PORT=8081 npm start.`
    );
    process.exit(1);
  }

  throw error;
});
