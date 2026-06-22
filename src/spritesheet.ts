export default class Spritesheet {
  img: typeof Image
  width: number
  height: number
  tiles: Map<string, HTMLCanvasElement>

  constructor(
    img: typeof Image,
    options: { width: number, height: number} = { width: 16, height: 16 }
  ) {
    this.img = img
    this.width = options.width
    this.height = options.height
    this.tiles = new Map()
  }

  draw({
    x,
    y,
    context,
    key
  }: {
    x: number
    y: number
    context: CanvasRenderingContext2D
    key: string
  }) {
    const buffer = this.tiles.get(key)
    if (!buffer) {
      console.warn('cannot find tile for key', key)
      return
    }
    context.drawImage(buffer, x, y)
  }

  drawTile(drawOpts: {
    x: number
    y: number
    context: CanvasRenderingContext2D
    key: string
  }) {
    this.draw({...drawOpts, x: drawOpts.x * this.width, y: drawOpts.y * this.height })
  }
}