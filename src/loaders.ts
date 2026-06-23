import { Level, LevelZ } from './assets/levels/type'

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    let failed = true
    image.addEventListener('load', () => {
      resolve(image)
      failed = false
    })
    image.src = url
    setTimeout(() => {
      if (failed) {
        reject(`could not load image url ${url}`)
      }
    }, 2000)
  })
}

export function loadLevel(name: string): Promise<Level> {
  return fetch(`/assets/levels/${name}.json`)
    .then((r) => r.json())
    .then((obj) => {
      const levelParse = LevelZ.safeParse(obj)
      if (levelParse.error) {
        throw Error(`failed to parse level ${name}`, levelParse.error)
      }
      return levelParse.data
    })
    .catch((e) => {
      throw Error(e)
    })
}
