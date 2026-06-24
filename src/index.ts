import { Level } from './assets/levels/type'
import Compositor from './models/compositor'
import { createBgLayer, createSpriteLayer } from './layers'
import { loadImage, loadLevel } from './loaders'
import { loadBackgroundSprites, loadMarioSprite } from './sprite'
import Spritesheet from './models/spritesheet'

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

    const pos = {
      x: 64,
      y: 64,
    }

    const comp = new Compositor()
    comp.addLayer(createBgLayer(level.backgrounds, bgSprites))
    comp.addLayer(createSpriteLayer(marioSprite, pos))

    update()

    function update() {
      if (!context) {
        throw new Error('2D canvas rendering is not available.')
      }
      comp.draw(context)
      pos.x += 2
      pos.y += 1
      requestAnimationFrame(update)
    }
  } catch(e) {
    console.log('unhandled error', e)
  }

})()

