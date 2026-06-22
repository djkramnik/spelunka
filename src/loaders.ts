export function loadImage(url: string) {
  return new Promise((resolve) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.src = url
  })
}

export function loadLevel(name: string) {
  return fetch(`/assets/levels/${name}.json`)
    .then(r => r.json())
}