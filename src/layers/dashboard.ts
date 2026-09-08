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
export const TIMER_HUD_POSITION = [216, 16] as const;
export const PLAYER_POSITION_HUD_POSITION = [168, 24] as const;

function getPlayer(entities: ReadonlySet<Entity>): Entity | undefined {
    for (const entity of entities) {
        if (entity.traits.has(Player)) {
            return entity;
        }
    }
    return undefined;
}

function formatCoordinate(value: number): string {
    return Math.round(value).toString().padStart(3, '0');
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
    const timer = getTimerTrait(level.entities);

    return function drawDashboard(context): void {
        const player = getPlayer(level.entities);
        if (player?.traits.has(Health)) {
            const health = player.traits.get(Health);
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

        font.print(
            timer.currentTime.toFixed().padStart(3, '0'),
            context,
            TIMER_HUD_POSITION[0],
            TIMER_HUD_POSITION[1],
        );
        if (player !== undefined) {
            font.print(
                `X${formatCoordinate(player.pos.x)} Y${formatCoordinate(player.pos.y)}`,
                context,
                PLAYER_POSITION_HUD_POSITION[0],
                PLAYER_POSITION_HUD_POSITION[1],
            );
        }
    };
}
