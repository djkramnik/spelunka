import { Level, LevelZ } from './assets/levels/type'

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      reject(new Error(`Could not load image url ${url}`))
    }, 2000)

    image.addEventListener('load', () => {
      window.clearTimeout(timeout)
      resolve(image)
    })
    image.addEventListener('error', () => {
      window.clearTimeout(timeout)
      reject(new Error(`Could not load image url ${url}`))
    })

    image.src = url
  })
}

export async function loadLevel(name: string): Promise<Level> {
  const response = await fetch(`/assets/levels/${name}.json`)
  const obj = await response.json()
  const levelParse = LevelZ.safeParse(obj)

  if (!levelParse.success) {
    throw new Error(`Failed to parse level ${name}`, {
      cause: levelParse.error,
    })
  }

  return levelParse.data
}
