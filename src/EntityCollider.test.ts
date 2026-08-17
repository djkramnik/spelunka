import Entity from './Entity.js';
import EntityCollider from './EntityCollider.js';

function entity(name: string, x: number, y: number): Entity {
    const result = new Entity();
    result.pos.set(x, y);
    result.size.set(16, 16);
    result.collides = candidate => {
        collisionCallbacks.push([name, names.get(candidate) ?? 'unknown']);
    };
    names.set(result, name);
    return result;
}

const names = new Map<Entity, string>();
const collisionCallbacks: Array<[string, string]> = [];
const first = entity('first', 0, 0);
const overlapping = entity('overlapping', 8, 0);
const verticallySeparated = entity('vertically-separated', 8, 32);
const horizontallySeparated = entity('horizontally-separated', 100, 0);

const collider = new EntityCollider(new Set([
    first,
    overlapping,
    verticallySeparated,
    horizontallySeparated,
]));
const result = collider.check();

const expectedCallbacks: Array<[string, string]> = [
    ['first', 'overlapping'],
    ['overlapping', 'first'],
];
if (
    result.candidateChecks !== 3
    || result.overlaps !== 2
    || JSON.stringify(collisionCallbacks) !== JSON.stringify(expectedCallbacks)
) {
    throw new Error(`Unexpected sweep result: ${JSON.stringify({
        result,
        collisionCallbacks,
    })}`);
}

console.log('Entity collider sweep-and-prune regression passed');
