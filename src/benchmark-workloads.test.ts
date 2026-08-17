import type {PerformanceBenchmark} from '../shared/performance.js';
import {
    applyBenchmarkWorkload,
    benchmarkAttemptEnded,
} from './benchmark-workloads.js';
import Entity from './Entity.js';
import Go from './traits/Go.js';
import Jump from './traits/Jump.js';
import Killable from './traits/Killable.js';

function benchmark(name: PerformanceBenchmark['name']): PerformanceBenchmark {
    return {
        name,
        gitCommit: '0123456789abcdef0123456789abcdef01234567',
        sampleCount: 1,
        warmupSamples: 0,
    };
}

const mario = new Entity() as Entity & {turbo(state: boolean): void};
const go = new Go();
const jump = new Jump();
const killable = new Killable();
let turbo = false;
mario.addTrait(go);
mario.addTrait(jump);
mario.addTrait(killable);
mario.turbo = state => {
    turbo = state;
};
killable.dead = true;

const runRight = benchmark('run-right');
applyBenchmarkWorkload(runRight, mario);
if (
    go.dir !== 1
    || !turbo
    || jump.requestTime <= 0
    || !benchmarkAttemptEnded(runRight, mario)
) {
    throw new Error('Run-right workload controls or death detection failed');
}

console.log('Run-right workload controls regression passed');
