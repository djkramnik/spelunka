import type {CanvasLayer} from '../Compositor.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {Font} from '../loaders/font.js';
import Player from '../traits/Player.js';

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
    spriteBuffer.width = 32;
    spriteBuffer.height = 32;

    const spriteBufferContext = spriteBuffer.getContext('2d');
    if (!spriteBufferContext) {
        throw new Error('Unable to create player progress buffer context');
    }

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
            spriteBuffer.width,
            spriteBuffer.height,
        );
        entity.draw(spriteBufferContext);
        context.drawImage(spriteBuffer, size * 12, size * 15);
    };
}
