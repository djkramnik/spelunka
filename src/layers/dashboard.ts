import type {CanvasLayer} from '../Compositor.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {Font} from '../loaders/font.js';
import SpriteSheet from '../SpriteSheet.js';
import Health from '../traits/Health.js';
import LevelTimer from '../traits/LevelTimer.js';
import Player from '../traits/Player.js';

export const HEALTH_HUD_HEART_POSITION = [8, 4] as const;
export const HEALTH_HUD_NUMBER_POSITION = [24, 4] as const;
export const HEALTH_HUD_DIGIT_ADVANCE = 14.4;

function getPlayerHealth(entities: ReadonlySet<Entity>): Health | undefined {
    for (const entity of entities) {
        if (entity.traits.has(Player) && entity.traits.has(Health)) {
            return entity.traits.get(Health);
        }
    }
    return undefined;
}

function getTimerTrait(entities: ReadonlySet<Entity>): LevelTimer {
    for (const entity of entities) {
        if (entity.traits.has(LevelTimer)) {
            return entity.traits.get(LevelTimer);
        }
    }
    throw new Error('Dashboard requires a level timer entity');
}

export function createDashboardLayer(
    font: Font,
    hud: SpriteSheet,
    level: Level,
): CanvasLayer {
    const line1 = font.size;
    const line2 = font.size * 2;
    const timer = getTimerTrait(level.entities);

    return function drawDashboard(context): void {
        const health = getPlayerHealth(level.entities);
        if (health !== undefined) {
            hud.draw(
                'heart',
                context,
                HEALTH_HUD_HEART_POSITION[0],
                HEALTH_HUD_HEART_POSITION[1],
            );
            [...health.hearts.toString()].forEach((digit, index) => {
                hud.draw(
                    `digit-${digit}`,
                    context,
                    HEALTH_HUD_NUMBER_POSITION[0]
                        + index * HEALTH_HUD_DIGIT_ADVANCE,
                    HEALTH_HUD_NUMBER_POSITION[1],
                );
            });
        }

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
