import Compositor from "./compositor"
import Entity from "./entity"

export default class Level {
  gravity: number = 2000
  comp: Compositor = new Compositor()
  entities = new Set<Entity>()

  constructor() {

  }
}