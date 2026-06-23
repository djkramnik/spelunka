import { Level } from './assets/levels/type'
import Compositor from './compositor'
import { createBgLayer } from './layers'
import { loadImage, loadLevel } from './loaders'
import { loadBackgroundSprites, loadMarioSprite } from './sprite'
import Spritesheet from './spritesheet'

const canvas = document.querySelector<HTMLCanvasElement>('#game')

if (!canvas) {
  throw new Error('Game canvas was not found.')
}

const context = canvas.getContext('2d')

;(async () => {
  try {
    const [marioSprite, bgSprites, level] = await Promise.all([
      loadMarioSprite(),
      loadBackgroundSprites(),
      loadLevel('1-1')
    ])
    console.log('stuff loaded', marioSprite, bgSprites, level)
    const comp = new Compositor()
    comp.addLayer(createBgLayer(level.backgrounds, bgSprites))

    update()

    function update() {
      if (!context) {
        throw new Error('2D canvas rendering is not available.')
      }
      comp.draw(context)
      requestAnimationFrame(update)
    }
  } catch(e) {
    console.log('unhandled error', e)
  }

  // const [marioSprite, bgSprites, level] = await Promise.all([
  //   loadMarioSprite(),
  //   loadBackgroundSprites(),
  //   loadLevel('1-1')
  // ])
  // console.log('stuff loaded', marioSprite, bgSprites, level)
})()

// loadImage('/assets/tiles.png').then((img) => {
//   console.log('we have img', img)
//   const sprites = new Spritesheet(img)
//   sprites.defineTile({
//     name: 'ground',
//     x: 0,
//     y: 0,
//   })
//   sprites.defineTile({
//     name: 'sky',
//     x: 3,
//     y: 23,
//   })
//   loadLevel('1-1').then((level) => {
//     level.backgrounds.forEach((bg) => {
//       drawBg({
//         bg,
//         context,
//         sprites,
//       })
//     })
//   })
// })

