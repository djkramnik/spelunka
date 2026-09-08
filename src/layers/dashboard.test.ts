import Entity from '../Entity.js';
import Level from '../Level.js';
import type {Font} from '../loaders/font.js';
import type SpriteSheet from '../SpriteSheet.js';
import Health from '../traits/Health.js';
import LevelTimer from '../traits/LevelTimer.js';
import Player from '../traits/Player.js';
import {
    createDashboardLayer,
    HEALTH_HUD_DIGIT_ADVANCE,
    HEALTH_HUD_HEART_POSITION,
    HEALTH_HUD_NUMBER_POSITION,
    PLAYER_POSITION_HUD_POSITION,
    TIMER_HUD_POSITION,
} from './dashboard.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const fontPrints: Array<[string, number, number]> = [];
const font = {
    size: 8,
    print: (
        text: string,
        _context: CanvasRenderingContext2D,
        x: number,
        y: number,
    ): void => {
        fontPrints.push([text, x, y]);
    },
} as Font;

const hudDraws: Array<[string, number, number]> = [];
const hud = {
    draw: (
        name: string,
        _context: CanvasRenderingContext2D,
        x: number,
        y: number,
    ): void => {
        hudDraws.push([name, x, y]);
    },
} as SpriteSheet;

const level = new Level();
level.name = 'tutorial-1-scale';
const timerEntity = new Entity();
timerEntity.addTrait(new LevelTimer());
level.entities.add(timerEntity);
const playerEntity = new Entity();
playerEntity.pos.set(64, 48);
playerEntity.addTrait(new Player());
const health = new Health();
playerEntity.addTrait(health);
level.entities.add(playerEntity);

const draw = createDashboardLayer(font, hud, level);
draw({} as CanvasRenderingContext2D);
assertEqual(
    hudDraws,
    [
        ['heart', ...HEALTH_HUD_HEART_POSITION],
        ['digit-4', ...HEALTH_HUD_NUMBER_POSITION],
    ],
    'HUD starts with the HD heart and four counter glyph',
);

hudDraws.length = 0;
health.heal(8);
playerEntity.pos.set(77.6, 49.2);
draw({} as CanvasRenderingContext2D);
assertEqual(
    hudDraws,
    [
        ['heart', ...HEALTH_HUD_HEART_POSITION],
        ['digit-1', ...HEALTH_HUD_NUMBER_POSITION],
        [
            'digit-2',
            HEALTH_HUD_NUMBER_POSITION[0] + HEALTH_HUD_DIGIT_ADVANCE,
            HEALTH_HUD_NUMBER_POSITION[1],
        ],
    ],
    'HUD reads the authoritative heart value on every draw',
);
assertEqual(
    fontPrints,
    [
        ['300', ...TIMER_HUD_POSITION],
        ['X064 Y048', ...PLAYER_POSITION_HUD_POSITION],
        ['300', ...TIMER_HUD_POSITION],
        ['X078 Y049', ...PLAYER_POSITION_HUD_POSITION],
    ],
    'Top-right HUD contains the timer and live rounded player coordinates',
);

hudDraws.length = 0;
level.entities.delete(playerEntity);
draw({} as CanvasRenderingContext2D);
assertEqual(
    hudDraws,
    [],
    'Health HUD disappears cleanly after the player is removed',
);
assertEqual(
    fontPrints.at(-1),
    ['300', ...TIMER_HUD_POSITION],
    'Coordinate readout disappears cleanly after the player is removed',
);

console.log('Spelunky HD health HUD rendering regression passed');
