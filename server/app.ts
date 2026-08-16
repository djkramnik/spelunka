import express from 'express';
import type {NextFunction, Request, Response} from 'express';
import performanceRouter from './routes/performance.js';

export function createApp(): express.Express {
    const app = express();

    app.use(express.json({limit: '1mb'}));
    app.use('/api/performance-samples', performanceRouter);

    app.get('/health', (_request, response) => {
        response.status(200).json({ok: true});
    });

    app.use((
        error: unknown,
        _request: Request,
        response: Response,
        _next: NextFunction,
    ) => {
        console.error('[performance-server] request failed', error);
        response.status(500).json({error: 'Unable to save performance data'});
    });

    return app;
}
