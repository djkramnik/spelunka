import {Matrix} from './math.js';

export interface TileMatch<Tile> {
    tile: Tile;
    indexX: number;
    indexY: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

export default class TileResolver<Tile> {
    constructor(
        readonly matrix: Matrix<Tile>,
        readonly tileSize = 16,
    ) {}

    toIndex(position: number): number {
        return Math.floor(position / this.tileSize);
    }

    toIndexRange(position1: number, position2: number): number[] {
        const positionMax = Math.ceil(position2 / this.tileSize) * this.tileSize;
        const range: number[] = [];
        let position = position1;

        do {
            range.push(this.toIndex(position));
            position += this.tileSize;
        } while (position < positionMax);

        return range;
    }

    getByIndex(indexX: number, indexY: number): TileMatch<Tile> | undefined {
        const tile = this.matrix.get(indexX, indexY);
        if (tile === undefined) {
            return undefined;
        }

        const x1 = indexX * this.tileSize;
        const x2 = x1 + this.tileSize;
        const y1 = indexY * this.tileSize;
        const y2 = y1 + this.tileSize;

        return {tile, indexX, indexY, x1, x2, y1, y2};
    }

    searchByPosition(posX: number, posY: number): TileMatch<Tile> | undefined {
        return this.getByIndex(
            this.toIndex(posX),
            this.toIndex(posY),
        );
    }

    searchByRange(
        x1: number,
        x2: number,
        y1: number,
        y2: number,
    ): Array<TileMatch<Tile>> {
        const matches: Array<TileMatch<Tile>> = [];

        this.toIndexRange(x1, x2).forEach(indexX => {
            this.toIndexRange(y1, y2).forEach(indexY => {
                const match = this.getByIndex(indexX, indexY);
                if (match) {
                    matches.push(match);
                }
            });
        });

        return matches;
    }
}
