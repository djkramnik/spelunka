import Entity from './Entity.js';
import type {Vec2} from './math.js';
import Player from './traits/Player.js';
import PlayerController from './traits/PlayerController.js';

export function createPlayerEnv(
    playerEntity: Entity,
    checkpoint?: Vec2,
): Entity {
    const playerEnvironment = new Entity();
    const playerController = new PlayerController();
    if (checkpoint) {
        playerController.checkpoint.copy(checkpoint);
    } else {
        playerController.checkpoint.set(64, 64);
    }
    playerController.setPlayer(playerEntity);
    playerEnvironment.addTrait(playerController);
    return playerEnvironment;
}

export function makePlayer(entity: Entity, name: string): Player {
    const player = new Player();
    player.name = name;
    entity.addTrait(player);
    return player;
}

export function* findPlayers(
    entities: Iterable<Entity>,
): Generator<Entity> {
    for (const entity of entities) {
        if (entity.traits.has(Player)) {
            yield entity;
        }
    }
}
