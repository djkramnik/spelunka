import Entity from '../Entity.js';
import Level from '../Level.js';
import {setupTriggers} from '../loaders/level.js';
import {LevelSpecSchema} from '../loaders/schemas.js';
import {makePlayer} from '../player.js';
import type {GameContext} from '../Scene.js';
import Trigger from './Trigger.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const baseLevelSpec = {
    spriteSheet: 'overworld',
    musicSheet: 'silent',
    patternSheet: 'overworld-pattern',
    size: [16, 30],
    layers: [],
    entities: [],
};
const teleportSpec = LevelSpecSchema.parse({
    ...baseLevelSpec,
    triggers: [{
        type: 'teleport',
        pos: [224, 432],
        size: [16, 32],
        destination: [64, 64],
    }],
});

if (LevelSpecSchema.safeParse({
    ...baseLevelSpec,
    triggers: [{
        type: 'teleport',
        pos: [224, 432],
        size: [0, 32],
        destination: [64, 64],
    }],
}).success) {
    throw new Error('Teleport triggers must reject non-positive sizes');
}

const level = new Level();
setupTriggers(teleportSpec, level);
const triggerEntity = [...level.entities][0];
if (!triggerEntity) {
    throw new Error('Expected setupTriggers to create a trigger entity');
}
assertEqual(
    [triggerEntity.pos.x, triggerEntity.pos.y],
    [224, 432],
    'Teleport trigger position',
);
assertEqual(
    [triggerEntity.size.x, triggerEntity.size.y],
    [16, 32],
    'Teleport trigger size',
);

const trigger = triggerEntity.traits.get(Trigger);
const player = new Entity();
makePlayer(player, 'MARIO');
player.pos.set(220, 420);
player.vel.set(90, 180);
level.entities.add(player);

const nonPlayer = new Entity();
nonPlayer.pos.set(222, 422);
nonPlayer.vel.set(10, 20);
level.entities.add(nonPlayer);

const gameContext = {} as GameContext;
trigger.collides(triggerEntity, nonPlayer);
trigger.collides(triggerEntity, player);
trigger.update(triggerEntity, gameContext, level);

assertEqual([player.pos.x, player.pos.y], [64, 64], 'Player teleport destination');
assertEqual([player.vel.x, player.vel.y], [0, 0], 'Player teleport velocity reset');
assertEqual([nonPlayer.pos.x, nonPlayer.pos.y], [222, 422], 'Non-player position');
assertEqual([nonPlayer.vel.x, nonPlayer.vel.y], [10, 20], 'Non-player velocity');
if (!level.entities.has(player) || !level.entities.has(triggerEntity)) {
    throw new Error('Teleporting must preserve the current Level and entity instances');
}

player.pos.set(100, 100);
player.vel.set(5, 6);
trigger.collides(triggerEntity, player);
trigger.update(triggerEntity, gameContext, level);
assertEqual(
    [player.pos.x, player.pos.y, player.vel.x, player.vel.y],
    [100, 100, 5, 6],
    'Continuous overlap must not teleport repeatedly',
);

trigger.update(triggerEntity, gameContext, level);
trigger.collides(triggerEntity, player);
trigger.update(triggerEntity, gameContext, level);
assertEqual(
    [player.pos.x, player.pos.y, player.vel.x, player.vel.y],
    [64, 64, 0, 0],
    'Leaving and re-entering must reactivate teleportation',
);

const gotoSpec = LevelSpecSchema.parse({
    ...baseLevelSpec,
    triggers: [{type: 'goto', name: '1-2', pos: [64, 64]}],
});
const gotoLevel = new Level();
setupTriggers(gotoSpec, gotoLevel);
const gotoEntity = [...gotoLevel.entities][0];
if (!gotoEntity) {
    throw new Error('Expected setupTriggers to create a goto trigger entity');
}
const gotoTrigger = gotoEntity.traits.get(Trigger);
const gotoPlayer = new Entity();
makePlayer(gotoPlayer, 'MARIO');
let gotoEvents = 0;
gotoLevel.events.listen(Level.EVENT_TRIGGER, (spec, entity, touches) => {
    if (
        spec.type !== 'goto'
        || spec.name !== '1-2'
        || entity !== gotoEntity
        || !touches.has(gotoPlayer)
    ) {
        throw new Error('Goto trigger emitted unexpected event data');
    }
    gotoEvents++;
});

gotoTrigger.collides(gotoEntity, gotoPlayer);
gotoTrigger.update(gotoEntity, gameContext, gotoLevel);
gotoTrigger.collides(gotoEntity, gotoPlayer);
gotoTrigger.update(gotoEntity, gameContext, gotoLevel);
assertEqual(gotoEvents, 1, 'Goto trigger entry behavior');

console.log('Same-level teleport trigger regression passed');
