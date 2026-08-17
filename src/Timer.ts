import type PerformanceMetrics from './PerformanceMetrics.js';

export type TimerUpdate = (deltaTime: number) => void;

export default class Timer {
    update: TimerUpdate = () => {};

    private readonly updateProxy: FrameRequestCallback;
    private animationFrame: number | null = null;
    private running = false;

    constructor(
        deltaTime = 1 / 60,
        private readonly performanceMetrics?: PerformanceMetrics,
    ) {
        let accumulatedTime = 0;
        let lastTime: number | null = null;

        this.updateProxy = time => {
            this.animationFrame = null;
            if (!this.running) {
                return;
            }

            let simulationSteps = 0;

            if (lastTime !== null) {
                accumulatedTime += (time - lastTime) / 1000;
                accumulatedTime = Math.min(accumulatedTime, 1);

                while (accumulatedTime > deltaTime) {
                    if (this.performanceMetrics) {
                        this.performanceMetrics.measure('fixedStep', () => {
                            this.update(deltaTime);
                        });
                    } else {
                        this.update(deltaTime);
                    }
                    accumulatedTime -= deltaTime;
                    simulationSteps++;
                }
            }

            lastTime = time;
            this.performanceMetrics?.observeAnimationFrame(
                time,
                simulationSteps,
                accumulatedTime,
            );
            this.enqueue();
        };
    }

    private enqueue(): void {
        if (this.running && this.animationFrame === null) {
            this.animationFrame = requestAnimationFrame(this.updateProxy);
        }
    }

    start(): void {
        this.running = true;
        this.enqueue();
    }

    stop(): void {
        this.running = false;
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}
