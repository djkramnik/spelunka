import 'dotenv/config';

import http from 'node:http';
import {createApp} from './app.js';
import {prisma} from './db/prisma.js';
import {getServerEnvironment} from './environment.js';

async function bootstrap(): Promise<void> {
    const environment = getServerEnvironment();
    const server = http.createServer(createApp());

    server.listen(environment.port, '127.0.0.1', () => {
        console.log(
            `[performance-server] listening on http://127.0.0.1:${environment.port}`,
        );
    });

    let shuttingDown = false;
    const shutdown = (signal: string): void => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        console.log(`[performance-server] ${signal} received, shutting down`);

        server.close(() => {
            void prisma.$disconnect().finally(() => {
                process.exit(0);
            });
        });

        setTimeout(() => {
            process.exit(1);
        }, 10_000).unref();
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
}

void bootstrap().catch(async error => {
    console.error('[performance-server] failed to start', error);
    await prisma.$disconnect();
    process.exit(1);
});
