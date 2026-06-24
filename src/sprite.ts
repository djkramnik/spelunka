import Spritesheet from './models/spritesheet'
import { loadImage } from './loaders'

export async function loadMarioSprite(): Promise<Spritesheet> {
  const img = await loadImage('/assets/characters.gif')
  const mario = new Spritesheet(img)
  mario.define({
    name: 'idle',
    x: 276,
    y: 44,
    width: 16,
    height: 16,
  })
  return mario
}

export async function loadBackgroundSprites(): Promise<Spritesheet> {
  const img = await loadImage('/assets/tiles.png')
  const bgSprites = new Spritesheet(img)
  bgSprites.defineTile({
    name: 'ground',
    x: 0,
    y: 0,
  })
  bgSprites.defineTile({
    name: 'sky',
    x: 3,
    y: 23,
  })
  return bgSprites
}
