export type TimerUpdate = (deltaTime: number) => void;

export default class Timer {
    update: TimerUpdate = () => {};

    private readonly updateProxy: FrameRequestCallback;

    constructor(deltaTime = 1 / 60) {
        let accumulatedTime = 0;
        let lastTime: number | null = null;

        this.updateProxy = time => {
            if (lastTime !== null) {
                accumulatedTime += (time - lastTime) / 1000;
                accumulatedTime = Math.min(accumulatedTime, 1);

                while (accumulatedTime > deltaTime) {
                    this.update(deltaTime);
                    accumulatedTime -= deltaTime;
                }
            }

            lastTime = time;
            this.enqueue();
        };
    }

    private enqueue(): void {
        requestAnimationFrame(this.updateProxy);
    }

    start(): void {
        this.enqueue();
    }
}
