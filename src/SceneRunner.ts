import Scene, {GameContext} from './Scene.js';

export default class SceneRunner {
    private sceneIndex = -1;
    private readonly scenes: Array<Scene<any>> = [];

    addScene(scene: Scene<any>): void {
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
            currentScene.draw(gameContext);
        }
    }
}
