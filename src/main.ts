import Entity from './Entity.js';
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
import Scene from './Scene.js';
import type {GameContext} from './Scene.js';
import SceneRunner from './SceneRunner.js';
import TimedScene from './TimedScene.js';
import Timer from './Timer.js';

declare global {
    interface Window {
        mario?: Entity;
    }
}

const INITIAL_LOAD_TASKS = 9;
const LEVEL_LOAD_TASKS = 4;

async function main(canvas: HTMLCanvasElement, font: Font): Promise<void> {
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
    const loadLevel = createLevelLoader(entityFactory);
    const sceneRunner = new SceneRunner();

    const mario = entityFactory.mario();
    makePlayer(mario, 'MARIO');
    window.mario = mario;

    const inputRouter = setupKeyboard(window);
    inputRouter.addReceiver(mario);

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

        level.events.listen(Level.EVENT_TRIGGER, (
            spec: LevelSpec['triggers'][number],
            _trigger: Entity,
            touches: ReadonlySet<Entity>,
        ) => {
            for (const _player of findPlayers(touches)) {
                void runLevel(spec.name);
                return;
            }
        });

        const playerProgressLayer = createPlayerProgressLayer(font, level);
        const dashboardLayer = createDashboardLayer(font, level);

        mario.pos.set(0, 0);
        level.entities.add(mario);

        const playerEnvironment = createPlayerEnv(mario);
        level.entities.add(playerEnvironment);

        const waitScreen = new TimedScene();
        waitScreen.countDown = 2;
        waitScreen.comp.layers.push(createColorLayer('#000'));
        waitScreen.comp.layers.push(dashboardLayer);
        waitScreen.comp.layers.push(playerProgressLayer);
        sceneRunner.addScene(waitScreen);

        level.comp.layers.push(createCollisionLayer(level));
        level.comp.layers.push(dashboardLayer);
        sceneRunner.addScene(level);
        sceneRunner.runNext();
    }

    const performanceMetrics = new PerformanceMetrics({
        enabled: new URLSearchParams(window.location.search).get('perf') === '1',
        exportUrl: '/api/performance-samples',
    });
    const gameContext: GameContext = {
        audioContext,
        videoContext,
        entityFactory,
        deltaTime: 0,
        performanceMetrics,
    };

    const timer = new Timer(1 / 60, performanceMetrics);
    timer.update = deltaTime => {
        gameContext.deltaTime = deltaTime;
        sceneRunner.update(gameContext);
    };
    timer.start();

    await runLevel('1-1', true);
}

async function bootstrap(): Promise<void> {
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
        void main(canvas, font).catch(error => {
            console.error('Unable to start game', error);
        });
    };

    window.addEventListener('click', start);
}

void bootstrap().catch(error => {
    console.error('Unable to initialize game', error);
});
