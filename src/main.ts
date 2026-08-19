import Entity from './Entity.js';
import type {PerformanceSummary} from '../shared/performance.js';
import {
    applyBenchmarkWorkload,
    benchmarkAttemptEnded,
} from './benchmark-workloads.js';
import {loadEntities} from './entities.js';
import {setupKeyboard} from './input.js';
import {createCollisionLayer} from './layers/collision.js';
import {createColorLayer} from './layers/color.js';
import {createDashboardLayer} from './layers/dashboard.js';
import {createPlayerProgressLayer} from './layers/player-progress.js';
import {createTextLayer} from './layers/text.js';
import Level from './Level.js';
import {createLevelLoader} from './loaders/level.js';
import {Font, loadFont} from './loaders/font.js';
import type {LevelSpec} from './loaders/schemas.js';
import LoadingProgress from './loading-progress.js';
import PerformanceMetrics from './PerformanceMetrics.js';
import {createPlayerEnv, findPlayers, makePlayer} from './player.js';
import {parseRuntimeOptions} from './runtime-options.js';
import type {RuntimeOptions} from './runtime-options.js';
import Scene from './Scene.js';
import type {GameContext} from './Scene.js';
import SceneRunner from './SceneRunner.js';
import TimedScene from './TimedScene.js';
import Timer from './Timer.js';

declare global {
    const __GIT_COMMIT__: string;

    interface Window {
        mario?: Entity;
        performanceBenchmark?: {
            name: string;
            gitCommit: string;
            status: 'running' | 'complete' | 'failed';
            completedAt?: string;
            workloadLevelLoads?: number;
        };
    }
}

const INITIAL_LOAD_TASKS = 9;
const LEVEL_LOAD_TASKS = 4;

async function main(
    canvas: HTMLCanvasElement,
    font: Font,
    runtimeOptions: RuntimeOptions,
): Promise<void> {
    const videoContext = canvas.getContext('2d');
    if (!videoContext) {
        throw new Error('Unable to create the game canvas context');
    }

    const audioContext = new AudioContext();
    const loadingProgress = new LoadingProgress();

    loadingProgress.reset(INITIAL_LOAD_TASKS, 'Loading game');
    loadingProgress.draw(videoContext);

    const advanceLoadingProgress = (): void => {
        loadingProgress.advance();
        loadingProgress.draw(videoContext);
    };

    const entityFactory = await loadEntities(
        audioContext,
        advanceLoadingProgress,
    );
    const loadLevel = createLevelLoader(entityFactory, {
        musicEnabled: runtimeOptions.audioEnabled,
    });
    const sceneRunner = new SceneRunner();
    let benchmarkLevelLoads = 0;

    let mario = entityFactory.mario();
    makePlayer(mario, 'MARIO');
    window.mario = mario;

    if (runtimeOptions.benchmark) {
        applyBenchmarkWorkload(runtimeOptions.benchmark, mario);
    }

    if (runtimeOptions.inputEnabled) {
        const inputRouter = setupKeyboard(window);
        inputRouter.addReceiver(mario);
    }

    async function runLevel(
        name: string,
        continueStartupProgress = false,
    ): Promise<void> {
        if (continueStartupProgress) {
            loadingProgress.setLabel(`Loading ${name}`);
        } else {
            loadingProgress.reset(LEVEL_LOAD_TASKS, `Loading ${name}`);
        }

        const loadScreen = new Scene();
        loadScreen.comp.layers.push(createColorLayer('#000'));
        loadScreen.comp.layers.push(context => loadingProgress.draw(context));
        sceneRunner.addScene(loadScreen);
        sceneRunner.runNext();

        const level = await loadLevel(name, () => loadingProgress.advance());
        if (
            runtimeOptions.benchmark?.name === 'run-right'
            && name === runtimeOptions.initialLevelName
        ) {
            benchmarkLevelLoads++;
        }

        level.events.listen(Level.EVENT_TRIGGER, (
            spec: LevelSpec['triggers'][number],
            _trigger: Entity,
            touches: ReadonlySet<Entity>,
        ) => {
            if (spec.type !== 'goto') {
                return;
            }
            for (const _player of findPlayers(touches)) {
                void runLevel(spec.name);
                return;
            }
        });

        const playerProgressLayer = createPlayerProgressLayer(font, level);
        const dashboardLayer = createDashboardLayer(font, level);

        mario.pos.copy(level.playerSpawn);
        level.entities.add(mario);

        const playerEnvironment = createPlayerEnv(
            mario,
            runtimeOptions.performanceEnabled ? level.playerSpawn : undefined,
        );
        level.entities.add(playerEnvironment);

        const waitScreen = new TimedScene();
        // Keep the initial level card, but let trigger-driven transitions
        // advance to the newly loaded level on the next update.
        waitScreen.countDown = continueStartupProgress ? 2 : 0;
        waitScreen.comp.layers.push(createColorLayer('#000'));
        waitScreen.comp.layers.push(dashboardLayer);
        waitScreen.comp.layers.push(playerProgressLayer);
        sceneRunner.addScene(waitScreen);

        if (runtimeOptions.collisionDebugEnabled) {
            level.comp.layers.push(createCollisionLayer(level));
        }
        level.comp.layers.push(dashboardLayer);
        sceneRunner.addScene(level);
        sceneRunner.runNext();
    }

    if (runtimeOptions.benchmark) {
        window.performanceBenchmark = {
            name: runtimeOptions.benchmark.name,
            gitCommit: runtimeOptions.benchmark.gitCommit,
            status: 'running',
        };
    }

    let timer: Timer | null = null;
    let benchmarkRestartPending = false;
    const performanceMetrics = new PerformanceMetrics({
        enabled: runtimeOptions.performanceEnabled,
        exportUrl: '/api/performance-samples',
        ...(runtimeOptions.benchmark ? {
            benchmark: runtimeOptions.benchmark,
            maxReports: runtimeOptions.benchmark.sampleCount,
            onComplete: (summary: PerformanceSummary): void => {
                timer?.stop();
                const workloadComplete = runtimeOptions.benchmark?.name !== 'run-right'
                    || benchmarkLevelLoads > 1;
                window.performanceBenchmark = {
                    name: runtimeOptions.benchmark?.name ?? 'idle-start',
                    gitCommit: runtimeOptions.benchmark?.gitCommit ?? __GIT_COMMIT__,
                    status: workloadComplete ? 'complete' : 'failed',
                    completedAt: summary.capturedAt,
                    workloadLevelLoads: benchmarkLevelLoads,
                };
                if (workloadComplete) {
                    console.info(
                        `[performance] benchmark complete for ${summary.benchmark?.gitCommit}`,
                    );
                } else {
                    console.error('[performance] benchmark did not complete a level loop');
                }
            },
        } : {}),
    });
    const gameContext: GameContext = {
        audioContext,
        videoContext,
        entityFactory,
        deltaTime: 0,
        performanceMetrics,
    };

    const restartBenchmarkAttempt = async (): Promise<void> => {
        const benchmark = runtimeOptions.benchmark;
        if (!benchmark || benchmark.name !== 'run-right') {
            return;
        }

        const nextMario = entityFactory.mario();
        makePlayer(nextMario, 'MARIO');
        applyBenchmarkWorkload(benchmark, nextMario);
        mario = nextMario;
        window.mario = nextMario;

        await runLevel(runtimeOptions.initialLevelName);
        benchmarkRestartPending = false;
    };

    timer = new Timer(1 / 60, performanceMetrics);
    timer.update = deltaTime => {
        gameContext.deltaTime = deltaTime;
        if (
            runtimeOptions.benchmark
            && !benchmarkRestartPending
            && benchmarkAttemptEnded(runtimeOptions.benchmark, mario)
        ) {
            benchmarkRestartPending = true;
            void restartBenchmarkAttempt().catch(error => {
                timer?.stop();
                window.performanceBenchmark = {
                    name: runtimeOptions.benchmark?.name ?? 'run-right',
                    gitCommit: runtimeOptions.benchmark?.gitCommit ?? __GIT_COMMIT__,
                    status: 'failed',
                    workloadLevelLoads: benchmarkLevelLoads,
                };
                console.error('[performance] unable to restart benchmark attempt', error);
            });
        }
        sceneRunner.update(gameContext);
    };
    timer.start();

    await runLevel(runtimeOptions.initialLevelName, true);
}

async function bootstrap(): Promise<void> {
    const runtimeOptions = parseRuntimeOptions(
        new URLSearchParams(window.location.search),
        __GIT_COMMIT__,
    );
    const canvas = document.getElementById('screen');
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Game canvas #screen was not found');
    }

    const videoContext = canvas.getContext('2d');
    if (!videoContext) {
        throw new Error('Unable to create the game canvas context');
    }

    const font = await loadFont();
    createColorLayer('#000')(videoContext);
    createTextLayer(font, 'CLICK TO START')(videoContext);

    const start = (): void => {
        window.removeEventListener('click', start);
        void main(canvas, font, runtimeOptions).catch(error => {
            console.error('Unable to start game', error);
        });
    };

    if (runtimeOptions.autoStart) {
        start();
    } else {
        window.addEventListener('click', start);
    }
}

void bootstrap().catch(error => {
    console.error('Unable to initialize game', error);
});
