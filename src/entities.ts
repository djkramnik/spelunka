import Entity from './models/entity'
import Jump from './models/traits/jump'
import Velocity from './models/traits/velocity'
import { loadMarioSprite } from './sprite'

export async function createMario(): Promise<Entity> {
  const sprite = await loadMarioSprite()
  const mario = new Entity()
  mario.draw = (ctx: CanvasRenderingContext2D) => {
    sprite.draw({
      key: 'idle',
      context: ctx,
      x: mario.pos.x,
      y: mario.pos.y
    })
  }
  mario.addTrait(new Velocity())
  mario.addTrait(new Jump())
  return mario
}
