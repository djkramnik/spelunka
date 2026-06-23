export default class Spritesheet {
  img: HTMLImageElement
  width: number
  height: number
  tiles: Map<string, HTMLCanvasElement>

  constructor(
    img: HTMLImageElement,
    options: { width: number; height: number } = { width: 16, height: 16 },
  ) {
    this.img = img
    this.width = options.width
    this.height = options.height
    this.tiles = new Map()
  }

  define({
    name,
    x,
    y,
    width,
    height,
  }: {
    name: string
    x: number
    y: number
    width: number
    height: number
  }) {
    const buffer = document.createElement('canvas')
    buffer.height = height
    buffer.width = width
    const ctx = buffer.getContext('2d')
    if (!ctx) {
      throw Error(`unable to define ${name}.  could not acquire buffer`)
    }
    // I don't understand this particular line but I suppose it just draws the tile in isolation in its buffer

    ctx.drawImage(
      this.img, // the whole spritesheet image
      x,
      y,
      width,
      height,
      0, // destX: where to draw inside the tiny buffer canvas
      0, // destY: where to draw inside the tiny buffer canvas
      width,
      height,
    )

    this.tiles.set(name, buffer)
  }

  defineTile({ name, x, y }: { name: string; x: number; y: number }) {
    this.define({
      name,
      x: x * this.width,
      y: y * this.height,
      width: this.width,
      height: this.height,
    })
  }

  draw({
    x,
    y,
    context,
    key,
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
    this.draw({
      ...drawOpts,
      x: drawOpts.x * this.width,
      y: drawOpts.y * this.height,
    })
  }
}
