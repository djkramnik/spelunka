import {parseRuntimeOptions} from './runtime-options.js';

const commit = '0123456789abcdef0123456789abcdef01234567';
const options = parseRuntimeOptions(
    new URLSearchParams('perf=1&benchmark=idle-start'),
    commit,
);

if (
    !options.performanceEnabled
    || options.initialLevelName !== 'performance-entities'
    || !options.autoStart
    || options.inputEnabled
    || options.audioEnabled
    || options.collisionDebugEnabled
    || options.benchmark?.name !== 'idle-start'
    || options.benchmark.gitCommit !== commit
    || options.benchmark.sampleCount !== 4
    || options.benchmark.warmupSamples !== 1
) {
    throw new Error('Idle-start benchmark options were not deterministic');
}

console.log('Idle-start benchmark options regression passed');

const runRightOptions = parseRuntimeOptions(
    new URLSearchParams('perf=1&benchmark=run-right'),
    commit,
);
if (
    runRightOptions.benchmark?.name !== 'run-right'
    || runRightOptions.initialLevelName !== 'performance-entities'
    || runRightOptions.benchmark.sampleCount !== 8
    || runRightOptions.benchmark.warmupSamples !== 1
    || runRightOptions.inputEnabled
    || runRightOptions.audioEnabled
) {
    throw new Error('Run-right benchmark options were not deterministic');
}

console.log('Run-right benchmark options regression passed');

const debugOptions = parseRuntimeOptions(
    new URLSearchParams('debug=collision'),
    commit,
);
if (
    !debugOptions.collisionDebugEnabled
    || debugOptions.initialLevelName !== 'vertical-shaft'
    || debugOptions.autoStart
    || !debugOptions.audioEnabled
) {
    throw new Error('Collision visualization was not independently opt-in');
}

let rejectedBenchmarkWithoutMetrics = false;
try {
    parseRuntimeOptions(new URLSearchParams('benchmark=idle-start'), commit);
} catch {
    rejectedBenchmarkWithoutMetrics = true;
}
if (!rejectedBenchmarkWithoutMetrics) {
    throw new Error('Benchmark mode must require explicit performance collection');
}
