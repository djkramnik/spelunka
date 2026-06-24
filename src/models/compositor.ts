import { Layer } from "./layer"

export default class Compositor {
  layers: Array<Layer>
  constructor() {
    this.layers = []
  }

  addLayer(layer: Layer) {
    this.layers.push(layer)
  }

  draw(context: CanvasRenderingContext2D) {
    this.layers.forEach(l => l(context))
  }
}