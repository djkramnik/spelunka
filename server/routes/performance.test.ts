import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

test('POST /api/performance-samples persists a versioned summary', async () => {
    const [{createApp}, {prisma}] = await Promise.all([
        import('../app.js'),
        import('../db/prisma.js'),
    ]);
    const server = http.createServer(createApp());
    const sessionId = crypto.randomUUID();
    await new Promise<void>(resolve => {
        server.listen(0, '127.0.0.1', resolve);
    });

    try {
        const address = server.address();
        assert(address && typeof address === 'object');

        const summary = {
            schemaVersion: 1,
            sessionId,
            sequence: 1,
            capturedAt: new Date().toISOString(),
            window: {durationMs: 5000},
            environment: {
                sourceUrl: 'http://127.0.0.1:5173/?perf=1',
                userAgent: 'integration-test',
                viewportWidth: 1280,
                viewportHeight: 720,
                devicePixelRatio: 2,
            },
            timings: Object.fromEntries([
                'frameIntervalMs',
                'stepsPerAnimationFrame',
                'fixedStepMs',
                'updateMs',
                'collisionMs',
                'finalizationMs',
                'levelRemainderMs',
                'renderMs',
            ].map(name => [name, {
                samples: 300,
                median: 1,
                p95: 2,
                p99: 3,
                max: 4,
            }])),
            counters: {
                animationFrames: 300,
                renderedFrames: 300,
                simulationSteps: 300,
                catchUpFrames: 0,
                zeroStepFrames: 0,
                framesOver16_67Ms: 3,
                framesOver33_33Ms: 0,
                maxAccumulatorMs: 16,
                averageEntities: 12,
                maxEntities: 12,
                entityCollisionCandidates: 39600,
                collisionCandidatesPerLevelStep: 132,
                entityOverlaps: 30,
                tileCandidates: 900,
                tileCandidatesPerLevelStep: 3,
            },
        };

        const response = await fetch(
            `http://127.0.0.1:${address.port}/api/performance-samples`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(summary),
            },
        );

        assert.equal(response.status, 201);
        assert.equal(await prisma.performanceSession.count(), 1);
        const sample = await prisma.performanceSample.findFirstOrThrow();
        assert.equal(sample.sessionId, summary.sessionId);
        assert.equal(sample.sequence, 1);
        assert.deepEqual(sample.payload, summary);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close(error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        await prisma.performanceSession.deleteMany({
            where: {id: sessionId},
        });
        await prisma.$disconnect();
    }
});
