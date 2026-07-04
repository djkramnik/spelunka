import Matrix from "./matrix";

type Tile =  {
  tile: string
  x1: number
  x2: number
  y1: number
  y2: number
}

export default class TileResolver {
  matrix: Matrix
  tileSize: number

  constructor(m: Matrix, tileSize: number = 16) {
    this.matrix = m
    this.tileSize = tileSize
  }

  // absolute pixel position to tile index I think
  toIndex(pos: number): number {
    return Math.floor(pos / this.tileSize)
  }

  // pixel range to tile index rounded up
  toIndexRange(pos1: number, pos2: number): number[] {
    const pMax = Math.ceil(pos2 / this.tileSize) * this.tileSize
    const range = []
    let pos = pos1
    do {
      range.push(this.toIndex(pos))
      pos += this.tileSize
    } while(pos < pMax)
    return range
  }

  // return tile and abs x and y ranges given matrix grid coords
  getByIndex(x: number, y: number): Tile | undefined {
    const tile = this.matrix.get(x, y)
    if (!tile) {
      return undefined
    }
    const x1 = x * this.tileSize
    const x2 = x1 + this.tileSize
    const y1 = y * this.tileSize
    const y2 = y1 + this.tileSize
    return {
      tile,
      x1,
      x2,
      y1,
      y2
    }
  }

  // return tile
  searchByPosition(x: number, y: number) {
    return this.getByIndex(this.toIndex(x), this.toIndex(y))
  }

  // return every tile in the region defined by x1, x2, y1, y2
  searchByRange(x1: number, x2: number, y1: number, y2: number): Tile[] {
    const tiles: Tile[] = []
    const xTileRange = this.toIndexRange(x1, x2)
    const yTileRange = this.toIndexRange(y1, y2)
    for(const xTile of xTileRange) {
      for(const yTile of yTileRange) {
        const tile = this.getByIndex(xTile, yTile)
        if (tile) {
          tiles.push(tile)
        }
      }
    }
    return tiles
  }
}