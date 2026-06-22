export default class Spritesheet {
  img: HTMLImageElement
  width: number
  height: number
  tiles: Map<string, HTMLCanvasElement>

  constructor(
    img: HTMLImageElement,
    options: { width: number, height: number} = { width: 16, height: 16 }
  ) {
    this.img = img
    this.width = options.width
    this.height = options.height
    this.tiles = new Map()
  }

  define({ name, x, y }: { name: string, x: number, y: number }) {
    const buffer = document.createElement('canvas')
    buffer.height = this.height
    buffer.width = this.width
    const ctx = buffer.getContext('2d')
    if (!ctx) {
      throw Error(`unable to define ${name}.  could not acquire buffer`)
    }
    // I don't understand this particular line but I suppose it just draws the tile in isolation in its buffer

    ctx.drawImage(
      this.img,          // the whole spritesheet image
      this.width * x,   // sourceX: left edge of tile inside spritesheet
      this.height * y,  // sourceY: top edge of tile inside spritesheet
      this.width,       // sourceWidth: how much to cut out
      this.height,      // sourceHeight: how much to cut out
      0,                // destX: where to draw inside the tiny buffer canvas
      0,                // destY: where to draw inside the tiny buffer canvas
      this.width,       // destWidth: how wide to draw it
      this.height,      // destHeight: how tall to draw it
    )

    this.tiles.set(name, buffer)
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