import AudioBoard from './AudioBoard.js';
import BoundingBox from './BoundingBox.js';
import EventBuffer from './EventBuffer.js';
import type Level from './Level.js';
import {Vec2} from './math.js';
import type {GameContext} from './Scene.js';
import Trait from './Trait.js';
import type {CollisionTile} from './TileCollider.js';
import type {TileMatch} from './TileResolver.js';

const TOP: unique symbol = Symbol('top');
const BOTTOM: unique symbol = Symbol('bottom');
const LEFT: unique symbol = Symbol('left');
const RIGHT: unique symbol = Symbol('right');

export const Sides = {TOP, BOTTOM, LEFT, RIGHT} as const;
export type Side = typeof Sides[keyof typeof Sides];

export type TraitConstructor<TraitType extends Trait = Trait> =
    abstract new (...args: any[]) => TraitType;

export class TraitMap {
    private readonly traits = new Map<Function, Trait>();

    set<TraitType extends Trait>(trait: TraitType): void {
        this.traits.set(trait.constructor, trait);
    }

    get<TraitType extends Trait>(
        traitType: TraitConstructor<TraitType>,
    ): TraitType {
        const trait = this.traits.get(traitType);
        if (!trait) {
            throw new Error(`Entity is missing trait: ${traitType.name}`);
        }
        return trait as TraitType;
    }

    has<TraitType extends Trait>(traitType: TraitConstructor<TraitType>): boolean {
        return this.traits.has(traitType);
    }

    forEach(callback: (trait: Trait) => void): void {
        this.traits.forEach(callback);
    }
}

export default class Entity {
    audio = new AudioBoard();
    readonly events = new EventBuffer();
    readonly sounds = new Set<string>();

    readonly pos = new Vec2(0, 0);
    readonly vel = new Vec2(0, 0);
    readonly size = new Vec2(0, 0);
    readonly offset = new Vec2(0, 0);
    readonly bounds = new BoundingBox(this.pos, this.size, this.offset);

    readonly traits = new TraitMap();
    lifetime = 0;

    addTrait(trait: Trait): void {
        this.traits.set(trait);
    }

    collides(candidate: Entity): void {
        this.traits.forEach(trait => {
            trait.collides(this, candidate);
        });
    }

    obstruct(side: Side, match: TileMatch<CollisionTile>): void {
        this.traits.forEach(trait => {
            trait.obstruct(this, side, match);
        });
    }

    draw(_context: CanvasRenderingContext2D): void {}

    finalize(): void {
        this.events.emit(Trait.EVENT_TASK, this);

        this.traits.forEach(trait => {
            trait.finalize(this);
        });

        this.events.clear();
    }

    playSounds(audioBoard: AudioBoard, audioContext: AudioContext): void {
        this.sounds.forEach(name => {
            audioBoard.playAudio(name, audioContext);
        });

        this.sounds.clear();
    }

    update(gameContext: GameContext, level: Level): void {
        this.traits.forEach(trait => {
            trait.update(this, gameContext, level);
        });

        this.playSounds(this.audio, gameContext.audioContext);
        this.lifetime += gameContext.deltaTime;
    }
}
