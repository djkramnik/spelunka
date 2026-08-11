const PRESSED = 1;
const RELEASED = 0;

export type KeyState = typeof PRESSED | typeof RELEASED;
export type KeyCallback = (state: KeyState) => void;

export default class KeyboardState {
    private readonly keyStates = new Map<string, KeyState>();
    private readonly keyMap = new Map<string, KeyCallback>();

    addMapping(code: string, callback: KeyCallback): void {
        this.keyMap.set(code, callback);
    }

    handleEvent(event: KeyboardEvent): void {
        const callback = this.keyMap.get(event.code);
        if (!callback) {
            return;
        }

        event.preventDefault();

        const keyState = event.type === 'keydown' ? PRESSED : RELEASED;
        if (this.keyStates.get(event.code) === keyState) {
            return;
        }

        this.keyStates.set(event.code, keyState);
        callback(keyState);
    }

    listenTo(target: Window): void {
        target.addEventListener('keydown', event => this.handleEvent(event));
        target.addEventListener('keyup', event => this.handleEvent(event));
    }
}
