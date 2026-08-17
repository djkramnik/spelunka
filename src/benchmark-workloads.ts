import type {PerformanceBenchmark} from '../shared/performance.js';
import type Entity from './Entity.js';
import type {Mario} from './entities/Mario.js';
import Go from './traits/Go.js';
import Jump from './traits/Jump.js';
import Killable from './traits/Killable.js';

type BenchmarkPlayer = Entity & Pick<Mario, 'turbo'>;

/**
 * Apply benchmark controls directly so repeatability does not depend on the
 * browser accepting synthetic keyboard events or on which window has focus.
 */
export function applyBenchmarkWorkload(
    benchmark: PerformanceBenchmark,
    mario: BenchmarkPlayer,
): void {
    if (benchmark.name !== 'run-right') {
        return;
    }

    mario.traits.get(Go).dir = 1;
    mario.turbo(true);
    mario.traits.get(Jump).start();
}

export function benchmarkAttemptEnded(
    benchmark: PerformanceBenchmark,
    mario: BenchmarkPlayer,
): boolean {
    if (benchmark.name !== 'run-right') {
        return false;
    }
    return mario.traits.get(Killable).dead;
}
