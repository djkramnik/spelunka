import Keyboard from './KeyboardState.js';
import type {KeyState} from './KeyboardState.js';
import InputRouter from './InputRouter.js';
import Jump from './traits/Jump.js';
import Go from './traits/Go.js';

interface InputTraits {
    get(trait: typeof Jump): Jump;
    get(trait: typeof Go): Go;
}

interface KeyboardControlledEntity {
    traits: InputTraits;
    pickup(): void;
    turbo(state: KeyState): void;
}

export function setupKeyboard(target: Window): InputRouter<KeyboardControlledEntity> {
    const input = new Keyboard();
    const router = new InputRouter<KeyboardControlledEntity>();

    input.listenTo(target);

    input.addMapping('KeyZ', keyState => {
        if (keyState) {
            router.route(entity => entity.traits.get(Jump).start());
        } else {
            router.route(entity => entity.traits.get(Jump).cancel());
        }
    });

    input.addMapping('KeyX', keyState => {
        router.route(entity => entity.turbo(keyState));
    });

    input.addMapping('KeyD', keyState => {
        if (keyState) {
            router.route(entity => {
                entity.pickup();
            });
        }
    });

    input.addMapping('ArrowRight', keyState => {
        router.route(entity => {
            entity.traits.get(Go).dir += keyState ? 1 : -1;
        });
    });

    input.addMapping('ArrowLeft', keyState => {
        router.route(entity => {
            entity.traits.get(Go).dir += keyState ? -1 : 1;
        });
    });

    return router;
}
