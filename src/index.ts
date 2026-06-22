import { Level } from "./assets/levels/type";
import { loadImage, loadLevel } from "./loaders";
import Spritesheet from "./spritesheet";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("2D canvas rendering is not available.");
}

console.log('!!', canvas)

loadImage('/assets/tiles.png')
  .then(img => {
    console.log('we have img', img)
    const sprites = new Spritesheet(img)
    sprites.define({
      name: 'ground',
      x: 0,
      y: 0
    })
    sprites.define({
      name: 'sky',
      x: 3,
      y: 23
    })
    loadLevel('1-1')
      .then((level) => {
        level.backgrounds.forEach(bg => {
          drawBg({
            bg,
            context,
            sprites
          })
        })
      })
  })

function drawBg({
  bg,
  context,
  sprites
}: {
  bg: Level['backgrounds'][0]
  context: CanvasRenderingContext2D
  sprites: Spritesheet
}) {
  bg.ranges.forEach(([x1, x2, y1, y2]) => {
    for(let x = x1; x < x2; x += 1) {
      for(let y = y1; y < y2; y += 1) {
        sprites.drawTile({
          x,
          y,
          context,
          key: bg.tile
        })
      }
    }
  })
}