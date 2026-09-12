import Keyboard from './KeyboardState.js';
import type {KeyState} from './KeyboardState.js';
import InputRouter from './InputRouter.js';
import Jump from './traits/Jump.js';
import Go from './traits/Go.js';
import LedgeHang from './traits/LedgeHang.js';
import Crouch from './traits/Crouch.js';
import LadderClimb from './traits/LadderClimb.js';
import Killable from './traits/Killable.js';
import LookUp from './traits/LookUp.js';
import RopeDeployer from './traits/RopeDeployer.js';

interface InputTraits {
    get(trait: typeof Killable): Killable;
    get(trait: typeof Jump): Jump;
    get(trait: typeof Go): Go;
    get(trait: typeof LedgeHang): LedgeHang;
    get(trait: typeof Crouch): Crouch;
    get(trait: typeof LadderClimb): LadderClimb;
    get(trait: typeof LookUp): LookUp;
    get(trait: typeof RopeDeployer): RopeDeployer;
}

interface KeyboardControlledEntity {
    traits: InputTraits;
    useAction(): void;
    turbo(state: KeyState): void;
}

export function setupKeyboard(target: Window): InputRouter<KeyboardControlledEntity> {
    const input = new Keyboard();
    const router = new InputRouter<KeyboardControlledEntity>();

    input.listenTo(target);

    input.addMapping('KeyZ', keyState => {
        if (keyState) {
            router.route(entity => {
                if (!entity.traits.get(Killable).dead) {
                    entity.traits.get(Jump).start();
                }
            });
        } else {
            router.route(entity => entity.traits.get(Jump).cancel());
        }
    });

    input.addMapping('KeyX', keyState => {
        router.route(entity => {
            if (!entity.traits.get(Killable).dead) {
                entity.turbo(keyState);
            }
        });
    });

    input.addMapping('KeyD', keyState => {
        if (keyState) {
            router.route(entity => {
                if (!entity.traits.get(Killable).dead) {
                    entity.useAction();
                }
            });
        }
    });

    input.addMapping('KeyS', keyState => {
        if (keyState) {
            router.route(entity => {
                if (!entity.traits.get(Killable).dead) {
                    entity.traits.get(RopeDeployer).requestDeploy();
                }
            });
        }
    });

    input.addMapping('ArrowRight', keyState => {
        router.route(entity => {
            if (!entity.traits.get(Killable).dead) {
                entity.traits.get(Go).dir += keyState ? 1 : -1;
            }
        });
    });

    input.addMapping('ArrowLeft', keyState => {
        router.route(entity => {
            if (!entity.traits.get(Killable).dead) {
                entity.traits.get(Go).dir += keyState ? -1 : 1;
            }
        });
    });

    input.addMapping('ArrowUp', keyState => {
        router.route(entity => {
            if (entity.traits.get(Killable).dead) {
                return;
            }
            entity.traits.get(LadderClimb).setVerticalInput(-1, Boolean(keyState));
            entity.traits.get(LedgeHang).setVerticalInput(-1, Boolean(keyState));
            entity.traits.get(LookUp).setUp(Boolean(keyState));
        });
    });

    input.addMapping('ArrowDown', keyState => {
        router.route(entity => {
            if (entity.traits.get(Killable).dead) {
                return;
            }
            entity.traits.get(LadderClimb).setVerticalInput(1, Boolean(keyState));
            entity.traits.get(LedgeHang).setVerticalInput(1, Boolean(keyState));
            entity.traits.get(Crouch).setDown(Boolean(keyState));
        });
    });

    return router;
}
