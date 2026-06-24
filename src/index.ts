import Compositor from './models/compositor'
import { createBgLayer, createSpriteLayer } from './layers'
import { loadLevel } from './loaders'
import { loadBackgroundSprites } from './sprite'
import { createMario } from './entities'
import Timer from './models/timer'

const canvas = document.querySelector<HTMLCanvasElement>('#game')

if (!canvas) {
  throw new Error('Game canvas was not found.')
}

const context = canvas.getContext('2d')

if (!context) {
  throw new Error('Game canvas context is null. we cannot hold')
}

;(async () => {
  try {
    const [mario, bgSprites, level] = await Promise.all([
      createMario(),
      loadBackgroundSprites(),
      loadLevel('1-1')
    ])
    console.log('stuff loaded', mario, bgSprites, level)

    const comp = new Compositor()
    comp.addLayer(createBgLayer(level.backgrounds, bgSprites))

    const gravity = 30
    mario.pos.set(64,180)
    mario.vel.set(200, -600)

    comp.addLayer(createSpriteLayer(mario))

    const timer = new Timer(1/60)
    timer.updateFn = (deltaTime: number) => {
      comp.draw(context!)
      mario.update?.(deltaTime)
      mario.vel.y += gravity
    }
    timer.start()
  } catch(e) {
    console.log('unhandled error', e)
  }

})()

