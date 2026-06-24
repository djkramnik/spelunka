import { Level } from "./assets/levels/type"
import { Layer } from "./models/layer";
import Spritesheet from "./models/spritesheet"

export function createSpriteLayer(
  sprite: Spritesheet,
  pos: { x: number, y: number }
): Layer {
  return (ctx: CanvasRenderingContext2D) => {
    sprite.draw({
      key: 'idle',
      ...pos,
      context: ctx
    })
  };
}

export function createBgLayer(
  backgrounds: Array<Level['backgrounds'][0]>,
  sprites: Spritesheet
): Layer {
  const buffer = document.createElement('canvas')
  buffer.width = 256
  buffer.height = 240
  const ctx = buffer.getContext('2d')
  if (ctx === null) {
    throw Error('could not acquire context in createBgLayer')
  }
  backgrounds.forEach(bg => drawBg({ bg, context: ctx, sprites }))
  return (ctx: CanvasRenderingContext2D) => {
    ctx.drawImage(buffer, 0, 0)
  }
}

function drawBg({
  bg,
  context,
  sprites,
}: {
  bg: Level['backgrounds'][0]
  context: CanvasRenderingContext2D
  sprites: Spritesheet
}) {
  bg.ranges.forEach(([x1, x2, y1, y2]) => {
    for (let x = x1; x < x2; x += 1) {
      for (let y = y1; y < y2; y += 1) {
        sprites.drawTile({
          x,
          y,
          context,
          key: bg.tile,
        })
      }
    }
  })
}
