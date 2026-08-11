import type {CanvasLayer} from '../Compositor.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {Font} from '../loaders/font.js';
import LevelTimer from '../traits/LevelTimer.js';
import Player from '../traits/Player.js';

function getPlayerTrait(entities: ReadonlySet<Entity>): Player {
    for (const entity of entities) {
        if (entity.traits.has(Player)) {
            return entity.traits.get(Player);
        }
    }
    throw new Error('Dashboard requires a player entity');
}

function getTimerTrait(entities: ReadonlySet<Entity>): LevelTimer {
    for (const entity of entities) {
        if (entity.traits.has(LevelTimer)) {
            return entity.traits.get(LevelTimer);
        }
    }
    throw new Error('Dashboard requires a level timer entity');
}

export function createDashboardLayer(font: Font, level: Level): CanvasLayer {
    const line1 = font.size;
    const line2 = font.size * 2;
    const timer = getTimerTrait(level.entities);

    return function drawDashboard(context): void {
        const player = getPlayerTrait(level.entities);

        font.print(player.name, context, 16, line1);
        font.print(
            player.score.toString().padStart(6, '0'),
            context,
            16,
            line2,
        );
        font.print(
            `@x${player.coins.toString().padStart(2, '0')}`,
            context,
            96,
            line2,
        );

        font.print('WORLD', context, 152, line1);
        font.print(level.name, context, 160, line2);

        font.print('TIME', context, 208, line1);
        font.print(
            timer.currentTime.toFixed().padStart(3, '0'),
            context,
            216,
            line2,
        );
    };
}
