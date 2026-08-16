import type {PerformanceSummary} from '../shared/performance.js';

type TimingName =
    | 'fixedStep'
    | 'update'
    | 'collision'
    | 'finalization'
    | 'levelRemainder'
    | 'render';

type Distribution = PerformanceSummary['timings']['fixedStepMs'];

export interface PerformanceMetricsOptions {
    enabled: boolean;
    exportUrl: string;
}

const REPORT_INTERVAL_MS = 5_000;
const ONE_FRAME_MS = 1_000 / 60;
const TWO_FRAMES_MS = 2_000 / 60;

function round(value: number): number {
    return Math.round(value * 1_000) / 1_000;
}

function percentile(sortedValues: readonly number[], fraction: number): number {
    const index = Math.max(
        0,
        Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * fraction) - 1),
    );
    return sortedValues[index] ?? 0;
}

function summarize(values: readonly number[]): Distribution {
    if (values.length === 0) {
        return {samples: 0, median: null, p95: null, p99: null, max: null};
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    return {
        samples: values.length,
        median: round(percentile(sortedValues, 0.5)),
        p95: round(percentile(sortedValues, 0.95)),
        p99: round(percentile(sortedValues, 0.99)),
        max: round(sortedValues.at(-1) ?? 0),
    };
}

function average(values: readonly number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    return round(values.reduce((total, value) => total + value, 0) / values.length);
}

export default class PerformanceMetrics {
    private intervalStartedAt = performance.now();
    private lastAnimationFrameAt: number | null = null;
    private readonly sessionId = crypto.randomUUID();
    private sequence = 0;

    private readonly frameIntervals: number[] = [];
    private readonly stepsPerFrame: number[] = [];
    private readonly accumulatorDepths: number[] = [];
    private readonly entityCounts: number[] = [];
    private readonly timings: Record<TimingName, number[]> = {
        fixedStep: [],
        update: [],
        collision: [],
        finalization: [],
        levelRemainder: [],
        render: [],
    };

    private animationFrames = 0;
    private simulationSteps = 0;
    private catchUpFrames = 0;
    private zeroStepFrames = 0;
    private longFrames = 0;
    private veryLongFrames = 0;
    private entityCollisionCandidates = 0;
    private entityOverlaps = 0;
    private tileCandidates = 0;

    constructor(private readonly options: PerformanceMetricsOptions) {
        if (options.enabled) {
            console.info(
                `[performance] collection enabled for session ${this.sessionId}`,
            );
        }
    }

    measure<Result>(name: TimingName, operation: () => Result): Result {
        if (!this.options.enabled) {
            return operation();
        }

        const startedAt = performance.now();
        try {
            return operation();
        } finally {
            this.timings[name].push(performance.now() - startedAt);
        }
    }

    recordEntityWork(
        entityCount: number,
        collisionCandidates: number,
        overlaps: number,
    ): void {
        if (!this.options.enabled) {
            return;
        }

        this.entityCounts.push(entityCount);
        this.entityCollisionCandidates += collisionCandidates;
        this.entityOverlaps += overlaps;
    }

    recordTileCandidates(count: number): void {
        if (this.options.enabled) {
            this.tileCandidates += count;
        }
    }

    observeAnimationFrame(
        timestamp: number,
        simulationSteps: number,
        accumulatorSeconds: number,
    ): void {
        if (!this.options.enabled) {
            return;
        }

        if (this.lastAnimationFrameAt !== null) {
            const interval = timestamp - this.lastAnimationFrameAt;
            this.frameIntervals.push(interval);
            if (interval > ONE_FRAME_MS) {
                this.longFrames++;
            }
            if (interval > TWO_FRAMES_MS) {
                this.veryLongFrames++;
            }
        }

        this.lastAnimationFrameAt = timestamp;
        this.animationFrames++;
        this.simulationSteps += simulationSteps;
        this.stepsPerFrame.push(simulationSteps);
        this.accumulatorDepths.push(accumulatorSeconds * 1_000);

        if (simulationSteps > 1) {
            this.catchUpFrames++;
        } else if (simulationSteps === 0) {
            this.zeroStepFrames++;
        }

        if (timestamp - this.intervalStartedAt >= REPORT_INTERVAL_MS) {
            const summary = this.createSummary(timestamp);
            this.report(summary);
            this.reset(timestamp);
        }
    }

    private createSummary(timestamp: number): PerformanceSummary {
        const durationMs = timestamp - this.intervalStartedAt;
        const levelSteps = this.entityCounts.length;

        this.sequence++;
        return {
            schemaVersion: 1,
            sessionId: this.sessionId,
            sequence: this.sequence,
            capturedAt: new Date().toISOString(),
            window: {
                durationMs: round(durationMs),
            },
            environment: {
                sourceUrl: window.location.href,
                userAgent: navigator.userAgent,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
            },
            timings: {
                frameIntervalMs: summarize(this.frameIntervals),
                stepsPerAnimationFrame: summarize(this.stepsPerFrame),
                fixedStepMs: summarize(this.timings.fixedStep),
                updateMs: summarize(this.timings.update),
                collisionMs: summarize(this.timings.collision),
                finalizationMs: summarize(this.timings.finalization),
                levelRemainderMs: summarize(this.timings.levelRemainder),
                renderMs: summarize(this.timings.render),
            },
            counters: {
                animationFrames: this.animationFrames,
                renderedFrames: this.timings.render.length,
                simulationSteps: this.simulationSteps,
                catchUpFrames: this.catchUpFrames,
                zeroStepFrames: this.zeroStepFrames,
                framesOver16_67Ms: this.longFrames,
                framesOver33_33Ms: this.veryLongFrames,
                maxAccumulatorMs: summarize(this.accumulatorDepths).max,
                averageEntities: average(this.entityCounts),
                maxEntities: summarize(this.entityCounts).max,
                entityCollisionCandidates: this.entityCollisionCandidates,
                collisionCandidatesPerLevelStep:
                    levelSteps === 0
                        ? null
                        : round(this.entityCollisionCandidates / levelSteps),
                entityOverlaps: this.entityOverlaps,
                tileCandidates: this.tileCandidates,
                tileCandidatesPerLevelStep:
                    levelSteps === 0
                        ? null
                        : round(this.tileCandidates / levelSteps),
            },
        };
    }

    private report(summary: PerformanceSummary): void {
        const elapsedSeconds = round(summary.window.durationMs / 1_000);

        console.groupCollapsed(`[performance] ${elapsedSeconds}s runtime summary`);
        console.table(summary.timings);
        console.table(summary.counters);
        console.log('[performance] export payload', summary);
        console.groupEnd();

        setTimeout(() => {
            void fetch(this.options.exportUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(summary),
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`Performance export failed: ${response.status}`);
                }
            }).catch(error => {
                console.warn('[performance] unable to export summary', error);
            });
        }, 0);
    }

    private reset(timestamp: number): void {
        this.intervalStartedAt = timestamp;
        this.frameIntervals.length = 0;
        this.stepsPerFrame.length = 0;
        this.accumulatorDepths.length = 0;
        this.entityCounts.length = 0;
        Object.values(this.timings).forEach(samples => {
            samples.length = 0;
        });

        this.animationFrames = 0;
        this.simulationSteps = 0;
        this.catchUpFrames = 0;
        this.zeroStepFrames = 0;
        this.longFrames = 0;
        this.veryLongFrames = 0;
        this.entityCollisionCandidates = 0;
        this.entityOverlaps = 0;
        this.tileCandidates = 0;
    }
}
