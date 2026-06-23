import Spritesheet from './spritesheet'
import { loadImage } from './loaders'

export function loadMarioSprite(): Promise<Spritesheet> {
  return loadImage('/assets/characters.gif').then((img) => {
    const mario = new Spritesheet(img)
    mario.define({
      name: 'idle',
      x: 276,
      y: 44,
      width: 16,
      height: 16,
    })
    return mario
  })
}

export function loadBackgroundSprites(): Promise<Spritesheet> {
  return loadImage('/tiles.png').then((img) => {
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
  })
}
