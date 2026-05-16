import { config } from './config.js';
import { createApp } from './server.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`chama-resolve-api listening on http://localhost:${config.port}`);
});
