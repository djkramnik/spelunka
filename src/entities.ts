import Entity from './models/entity'
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
  mario.update = (deltaTime: number) => {
    mario.pos.set(
      mario.pos.x + (mario.vel.x * deltaTime),
      mario.pos.y + (mario.vel.y * deltaTime)
    )
  }
  return mario
}
