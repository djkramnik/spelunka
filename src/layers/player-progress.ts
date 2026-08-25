import type {CanvasLayer} from '../Compositor.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {Font} from '../loaders/font.js';
import Player from '../traits/Player.js';

const SPRITE_WORLD_SIZE = 20;
const SPRITE_BUFFER_SCALE = 4;
const SPRITE_BUFFER_SIZE = SPRITE_WORLD_SIZE * SPRITE_BUFFER_SCALE;
const SPRITE_PIVOT_X = 10;
const SPRITE_PIVOT_Y = 18.75;
const PROGRESS_SPRITE_SIZE = 32;

function getPlayer(entities: ReadonlySet<Entity>): Entity {
    for (const entity of entities) {
        if (entity.traits.has(Player)) {
            return entity;
        }
    }
    throw new Error('Player progress layer requires a player entity');
}

export function createPlayerProgressLayer(
    font: Font,
    level: Level,
): CanvasLayer {
    const {size} = font;
    const spriteBuffer = document.createElement('canvas');
    spriteBuffer.width = SPRITE_BUFFER_SIZE;
    spriteBuffer.height = SPRITE_BUFFER_SIZE;

    const spriteBufferContext = spriteBuffer.getContext('2d');
    if (!spriteBufferContext) {
        throw new Error('Unable to create player progress buffer context');
    }
    spriteBufferContext.imageSmoothingEnabled = false;
    spriteBufferContext.setTransform(
        SPRITE_BUFFER_SCALE,
        0,
        0,
        SPRITE_BUFFER_SCALE,
        0,
        0,
    );

    return function drawPlayerProgress(context): void {
        const entity = getPlayer(level.entities);
        const player = entity.traits.get(Player);

        font.print(`WORLD ${level.name}`, context, size * 12, size * 12);
        font.print(
            `x ${player.lives.toString().padStart(3, ' ')}`,
            context,
            size * 16,
            size * 16,
        );

        spriteBufferContext.clearRect(
            0,
            0,
            SPRITE_WORLD_SIZE,
            SPRITE_WORLD_SIZE,
        );
        spriteBufferContext.save();
        spriteBufferContext.translate(
            SPRITE_PIVOT_X - entity.size.x / 2,
            SPRITE_PIVOT_Y - entity.size.y,
        );
        entity.draw(spriteBufferContext);
        spriteBufferContext.restore();
        context.drawImage(
            spriteBuffer,
            0,
            0,
            SPRITE_BUFFER_SIZE,
            SPRITE_BUFFER_SIZE,
            size * 12,
            size * 15,
            PROGRESS_SPRITE_SIZE,
            PROGRESS_SPRITE_SIZE,
        );
    };
}
