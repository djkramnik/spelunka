import Scene from './Scene.js';
import type {GameContext} from './Scene.js';

type RunnableScene = Pick<
    Scene,
    'events' | 'draw' | 'update' | 'pause'
>;

export default class SceneRunner {
    private sceneIndex = -1;
    private readonly scenes: RunnableScene[] = [];

    addScene(scene: RunnableScene): void {
        scene.events.listen(Scene.EVENT_COMPLETE, () => {
            this.runNext();
        });
        this.scenes.push(scene);
    }

    runNext(): void {
        const currentScene = this.scenes[this.sceneIndex];
        if (currentScene) {
            currentScene.pause();
        }
        this.sceneIndex++;
    }

    update(gameContext: GameContext): void {
        const currentScene = this.scenes[this.sceneIndex];
        if (currentScene) {
            currentScene.update(gameContext);
            gameContext.performanceMetrics.measure('render', () => {
                currentScene.draw(gameContext);
            });
        }
    }
}
