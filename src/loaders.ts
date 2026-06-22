import { Level, LevelZ } from "./assets/levels/type"

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.src = url
  })
}

export function loadLevel(name: string): Promise<Level> {
  return fetch(`/assets/levels/${name}.json`)
    .then(r => r.json())
    .then(obj => {
      const levelParse = LevelZ.safeParse(obj)
      if (levelParse.error) {
        throw Error(`failed to parse level ${name}`, levelParse.error)
      }
      return levelParse.data
    })
}