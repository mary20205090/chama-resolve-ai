import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { HttpError } from './errors.js';
import { createRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/', (req, res) => {
    res.json({
      service: 'chama-resolve-api',
      status: 'ok',
      endpoints: {
        health: '/api/health',
        cases: '/api/cases'
      }
    });
  });

  app.use('/api', createRouter());

  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found.'
      }
    });
  });

  app.use((error, req, res, next) => {
    const status = error instanceof HttpError ? error.status : error.status || 500;
    const message = error instanceof HttpError ? error.message : 'Unexpected server error.';

    if (status >= 500) {
      console.error(error);
    }

    res.status(status).json({
      error: {
        message,
        details: error.details
      }
    });
  });

  return app;
}
