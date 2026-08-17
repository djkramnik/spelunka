import 'dotenv/config';

import {prisma} from '../db/prisma.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

async function main(): Promise<void> {
    const requestedLimit = Number(process.argv[2] ?? DEFAULT_LIMIT);
    if (
        !Number.isInteger(requestedLimit)
        || requestedLimit < 1
        || requestedLimit > MAX_LIMIT
    ) {
        throw new Error(
            `Sample limit must be an integer from 1 through ${MAX_LIMIT}`,
        );
    }

    const samples = await prisma.performanceSample.findMany({
        take: requestedLimit,
        orderBy: [
            {capturedAt: 'desc'},
            {id: 'desc'},
        ],
        include: {
            session: {
                select: {
                    startedAt: true,
                    lastSeenAt: true,
                    sourceUrl: true,
                    userAgent: true,
                },
            },
        },
    });

    console.log(JSON.stringify(samples, null, 2));
}

void main().catch(error => {
    console.error('[performance-query] unable to load samples', error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
