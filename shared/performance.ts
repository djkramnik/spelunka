import {z} from 'zod';

const DistributionZ = z.object({
    samples: z.number().int().nonnegative(),
    median: z.number().nonnegative().nullable(),
    p95: z.number().nonnegative().nullable(),
    p99: z.number().nonnegative().nullable(),
    max: z.number().nonnegative().nullable(),
});

export const PerformanceBenchmarkZ = z.object({
    name: z.literal('idle-start'),
    gitCommit: z.string().regex(/^[0-9a-f]{7,40}$/),
    sampleCount: z.number().int().positive(),
    warmupSamples: z.number().int().nonnegative(),
});

export const PerformanceSummaryZ = z.object({
    schemaVersion: z.literal(1),
    sessionId: z.string().uuid(),
    sequence: z.number().int().positive(),
    capturedAt: z.string().datetime(),
    benchmark: PerformanceBenchmarkZ.optional(),
    window: z.object({
        durationMs: z.number().positive(),
    }),
    environment: z.object({
        sourceUrl: z.string().url(),
        userAgent: z.string().min(1),
        viewportWidth: z.number().int().positive(),
        viewportHeight: z.number().int().positive(),
        devicePixelRatio: z.number().positive(),
    }),
    timings: z.object({
        frameIntervalMs: DistributionZ,
        stepsPerAnimationFrame: DistributionZ,
        fixedStepMs: DistributionZ,
        updateMs: DistributionZ,
        collisionMs: DistributionZ,
        finalizationMs: DistributionZ,
        levelRemainderMs: DistributionZ,
        renderMs: DistributionZ,
    }),
    counters: z.object({
        animationFrames: z.number().int().nonnegative(),
        renderedFrames: z.number().int().nonnegative(),
        simulationSteps: z.number().int().nonnegative(),
        catchUpFrames: z.number().int().nonnegative(),
        zeroStepFrames: z.number().int().nonnegative(),
        framesOver16_67Ms: z.number().int().nonnegative(),
        framesOver33_33Ms: z.number().int().nonnegative(),
        maxAccumulatorMs: z.number().nonnegative().nullable(),
        averageEntities: z.number().nonnegative().nullable(),
        maxEntities: z.number().int().nonnegative().nullable(),
        entityCollisionCandidates: z.number().int().nonnegative(),
        collisionCandidatesPerLevelStep: z.number().nonnegative().nullable(),
        entityOverlaps: z.number().int().nonnegative(),
        tileCandidates: z.number().int().nonnegative(),
        tileCandidatesPerLevelStep: z.number().nonnegative().nullable(),
    }),
});

export type PerformanceSummary = z.infer<typeof PerformanceSummaryZ>;
export type PerformanceBenchmark = z.infer<typeof PerformanceBenchmarkZ>;
