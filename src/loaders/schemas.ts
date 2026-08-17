import {z} from 'zod';

const CoordinateSchema = z.number().finite();
const PositiveNumberSchema = z.number().positive();
const NameSchema = z.string().min(1);
const PositionSchema = z.tuple([CoordinateSchema, CoordinateSchema]);

export type TileRange =
    | [number, number]
    | [number, number, number]
    | [number, number, number, number];

export const TileRangeSchema = z.custom<TileRange>((value): value is TileRange => {
    if (!Array.isArray(value)) {
        return false;
    }

    const coordinates: readonly unknown[] = value;
    if (!coordinates.every(coordinate => (
        typeof coordinate === 'number' && Number.isFinite(coordinate)
    ))) {
        return false;
    }

    if (coordinates.length === 2) {
        return true;
    }

    if (coordinates.length === 3) {
        return Number(coordinates[1]) > 0;
    }

    return coordinates.length === 4
        && Number(coordinates[1]) > 0
        && Number(coordinates[3]) > 0;
}, 'Expected a 2-, 3-, or 4-number tile range');

const TileRangesSchema = z.array(TileRangeSchema).min(1);

export const NamedTileSpecSchema = z.object({
    name: NameSchema,
    type: NameSchema.optional(),
    ranges: TileRangesSchema,
});

export const PatternTileSpecSchema = z.object({
    pattern: NameSchema,
    ranges: TileRangesSchema,
});

export const TileSpecSchema = z.union([
    NamedTileSpecSchema,
    PatternTileSpecSchema,
]);

const SpriteTileSchema = z.object({
    name: NameSchema,
    index: z.tuple([CoordinateSchema, CoordinateSchema]),
});

const SpriteFrameSchema = z.object({
    name: NameSchema,
    rect: z.tuple([
        CoordinateSchema,
        CoordinateSchema,
        PositiveNumberSchema,
        PositiveNumberSchema,
    ]),
});

const SpriteAnimationSchema = z.object({
    name: NameSchema,
    frameLen: PositiveNumberSchema,
    frames: z.array(NameSchema).min(1),
});

export const SpriteSheetSchema = z.object({
    imageURL: z.string().min(1),
    tileW: PositiveNumberSchema.optional(),
    tileH: PositiveNumberSchema.optional(),
    tiles: z.array(SpriteTileSchema).default([]),
    frames: z.array(SpriteFrameSchema).default([]),
    animations: z.array(SpriteAnimationSchema).default([]),
}).superRefine((sheet, context) => {
    if (sheet.tiles.length > 0
        && (sheet.tileW === undefined || sheet.tileH === undefined)) {
        context.addIssue({
            code: 'custom',
            message: 'tileW and tileH are required when tiles are defined',
            path: ['tiles'],
        });
    }
});

const AudioTrackSchema = z.object({
    url: z.string(),
});

export const SoundSheetSchema = z.object({
    fx: z.record(NameSchema, AudioTrackSchema),
});

export const MusicSheetSchema = z.record(NameSchema, AudioTrackSchema);

export const PatternSheetSchema = z.record(
    NameSchema,
    z.object({
        tiles: z.array(TileSpecSchema),
    }),
);

const LevelEntitySchema = z.object({
    name: NameSchema,
    pos: PositionSchema,
});

const GotoTriggerSchema = z.object({
    type: z.literal('goto'),
    name: NameSchema,
    pos: PositionSchema,
});

export const LevelSpecSchema = z.object({
    spriteSheet: NameSchema,
    musicSheet: NameSchema,
    patternSheet: NameSchema,
    playerSpawn: PositionSchema.default([0, 0]),
    layers: z.array(z.object({
        tiles: z.array(TileSpecSchema),
    })),
    entities: z.array(LevelEntitySchema),
    triggers: z.array(GotoTriggerSchema).default([]),
});

export type NamedTileSpec = z.infer<typeof NamedTileSpecSchema>;
export type TileSpec = z.infer<typeof TileSpecSchema>;
export type SpriteSheetSpec = z.infer<typeof SpriteSheetSchema>;
export type SoundSheet = z.infer<typeof SoundSheetSchema>;
export type MusicSheet = z.infer<typeof MusicSheetSchema>;
export type PatternSheet = z.infer<typeof PatternSheetSchema>;
export type LevelSpec = z.infer<typeof LevelSpecSchema>;
