export default class Matrix {
  grid: Array<Array<string>> = []

  forEach(callback: (tileName: string, x: number, y: number) => void) {
    this.grid.forEach((col, x) => {
      col.forEach((tileName, y) => {
        callback(tileName, x, y)
      })
    })
  }

  get(x: number, y: number): string | undefined {
    const cell = this.grid[x]?.[y]
    if (!cell) {
      console.warn(`Matrix lookup failed {${x}, ${y}`)
    }
    return cell
  }

  set(x: number, y: number, tileName: string) {
    if (!this.grid[x]) {
      this.grid[x] = []
    }
    this.grid[x][y] = tileName
  }
}