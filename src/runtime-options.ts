import type {PerformanceBenchmark} from '../shared/performance.js';

const IDLE_START_SAMPLE_COUNT = 4;
const IDLE_START_WARMUP_SAMPLES = 1;

export interface RuntimeOptions {
    performanceEnabled: boolean;
    collisionDebugEnabled: boolean;
    audioEnabled: boolean;
    autoStart: boolean;
    inputEnabled: boolean;
    benchmark?: PerformanceBenchmark;
}

export function parseRuntimeOptions(
    searchParams: URLSearchParams,
    gitCommit: string,
): RuntimeOptions {
    const performanceEnabled = searchParams.get('perf') === '1';
    const benchmarkName = searchParams.get('benchmark');

    if (benchmarkName !== null && benchmarkName !== 'idle-start') {
        throw new Error(`Unknown performance benchmark: ${benchmarkName}`);
    }
    if (benchmarkName && !performanceEnabled) {
        throw new Error('Performance benchmarks require ?perf=1');
    }
    if (benchmarkName && !/^[0-9a-f]{7,40}$/.test(gitCommit)) {
        throw new Error(`Unable to identify benchmark Git commit: ${gitCommit}`);
    }

    const benchmark = benchmarkName === 'idle-start'
        ? {
            name: benchmarkName,
            gitCommit,
            sampleCount: IDLE_START_SAMPLE_COUNT,
            warmupSamples: IDLE_START_WARMUP_SAMPLES,
        } satisfies PerformanceBenchmark
        : undefined;

    return {
        performanceEnabled,
        collisionDebugEnabled: searchParams.get('debug') === 'collision',
        audioEnabled: benchmark === undefined,
        autoStart: benchmark !== undefined,
        inputEnabled: benchmark === undefined,
        ...(benchmark ? {benchmark} : {}),
    };
}
