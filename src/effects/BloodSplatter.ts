import Entity from '../Entity.js';
import type Level from '../Level.js';
import type {Vec2} from '../math.js';
import type {GameContext} from '../Scene.js';

export type NumberRange = readonly [minimum: number, maximum: number];
export type RandomSource = () => number;

export interface BloodSplatterConfig {
    readonly count: number;
    readonly palette: readonly string[];
    readonly particleSize: NumberRange;
    readonly horizontalSpread: number;
    readonly verticalSpread: number;
    readonly horizontalSpeed: NumberRange;
    readonly upwardSpeed: NumberRange;
    readonly gravity: number;
    readonly lifetime: NumberRange;
    readonly zIndex: number;
}

export const BLOOD_PARTICLE_COUNT = 12;
export const BLOOD_PALETTE = [
    '#6f1018',
    '#a51622',
    '#d22b32',
] as const;
export const BLOOD_PARTICLE_SIZE: NumberRange = [1, 3];
export const BLOOD_HORIZONTAL_SPREAD = 4;
export const BLOOD_VERTICAL_SPREAD = 3;
export const BLOOD_HORIZONTAL_SPEED: NumberRange = [24, 96];
export const BLOOD_UPWARD_SPEED: NumberRange = [64, 152];
export const BLOOD_GRAVITY = 420;
export const BLOOD_LIFETIME: NumberRange = [0.28, 0.56];
export const BLOOD_Z_INDEX = 2;

export const DEFAULT_BLOOD_SPLATTER_CONFIG: BloodSplatterConfig = {
    count: BLOOD_PARTICLE_COUNT,
    palette: BLOOD_PALETTE,
    particleSize: BLOOD_PARTICLE_SIZE,
    horizontalSpread: BLOOD_HORIZONTAL_SPREAD,
    verticalSpread: BLOOD_VERTICAL_SPREAD,
    horizontalSpeed: BLOOD_HORIZONTAL_SPEED,
    upwardSpeed: BLOOD_UPWARD_SPEED,
    gravity: BLOOD_GRAVITY,
    lifetime: BLOOD_LIFETIME,
    zIndex: BLOOD_Z_INDEX,
};

export interface BloodSplatterOptions extends Partial<BloodSplatterConfig> {
    readonly random?: RandomSource;
}

function sampleRange(
    [minimum, maximum]: NumberRange,
    random: RandomSource,
): number {
    return minimum + (maximum - minimum) * random();
}

function sampleIntegerRange(
    [minimum, maximum]: NumberRange,
    random: RandomSource,
): number {
    return Math.min(
        Math.floor(maximum),
        Math.ceil(minimum) + Math.floor(
            (Math.floor(maximum) - Math.ceil(minimum) + 1) * random(),
        ),
    );
}

function validateConfig(config: BloodSplatterConfig): void {
    if (!Number.isInteger(config.count) || config.count < 0) {
        throw new RangeError('Blood particle count must be a non-negative integer');
    }
    if (config.palette.length === 0) {
        throw new RangeError('Blood palette must contain at least one colour');
    }
}

export class BloodParticle extends Entity {
    constructor(
        position: Pick<Vec2, 'x' | 'y'>,
        velocity: Pick<Vec2, 'x' | 'y'>,
        readonly colour: string,
        particleSize: number,
        readonly gravity: number,
        readonly expiresAfter: number,
        zIndex: number,
    ) {
        super();
        this.pos.set(position.x, position.y);
        this.vel.set(velocity.x, velocity.y);
        this.size.set(particleSize, particleSize);
        this.zIndex = zIndex;
        this.entityCollisionsEnabled = false;
    }

    override draw(context: CanvasRenderingContext2D): void {
        context.fillStyle = this.colour;
        context.fillRect(
            -this.size.x / 2,
            -this.size.y / 2,
            this.size.x,
            this.size.y,
        );
    }

    override update({deltaTime}: GameContext, level: Level): void {
        const remainingLifetime = Math.max(0, this.expiresAfter - this.lifetime);
        const elapsed = Math.min(deltaTime, remainingLifetime);

        this.pos.x += this.vel.x * elapsed;
        this.pos.y += this.vel.y * elapsed
            + this.gravity * elapsed * elapsed / 2;
        this.vel.y += this.gravity * elapsed;
        this.lifetime += elapsed;

        if (this.lifetime >= this.expiresAfter) {
            level.entities.delete(this);
        }
    }
}

export function emitBloodSplatter(
    level: Level,
    origin: Pick<Vec2, 'x' | 'y'>,
    options: BloodSplatterOptions = {},
): readonly BloodParticle[] {
    const {random = Math.random, ...overrides} = options;
    const config: BloodSplatterConfig = {
        ...DEFAULT_BLOOD_SPLATTER_CONFIG,
        ...overrides,
    };
    validateConfig(config);

    const particles: BloodParticle[] = [];
    for (let index = 0; index < config.count; index++) {
        const direction = random() < 0.5 ? -1 : 1;
        const particle = new BloodParticle(
            {
                x: origin.x
                    + direction * config.horizontalSpread * random(),
                y: origin.y
                    + (random() * 2 - 1) * config.verticalSpread,
            },
            {
                x: direction * sampleRange(config.horizontalSpeed, random),
                y: -sampleRange(config.upwardSpeed, random),
            },
            config.palette[Math.min(
                config.palette.length - 1,
                Math.floor(random() * config.palette.length),
            )] as string,
            sampleIntegerRange(config.particleSize, random),
            config.gravity,
            sampleRange(config.lifetime, random),
            config.zIndex,
        );
        particles.push(particle);
        level.entities.add(particle);
    }

    return particles;
}
