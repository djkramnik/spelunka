import Entity from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Stomper from './Stomper.js';

const mario = new Entity();
mario.size.set(16, 16);
mario.addTrait(new Stomper());

const trigger = new Entity();
trigger.size.set(64, 64);

const collider = new EntityCollider(new Set([mario, trigger]));
const overlaps = collider.check(mario);

if (overlaps !== 1) {
    throw new Error(`Expected one collision overlap, received ${overlaps}`);
}

console.log('Stomper collision regression passed');
