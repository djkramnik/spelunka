import Compositor from "./compositor"
import Entity from "./entity"
import Matrix from "./matrix"

export default class Level {
  gravity: number = 2000
  comp: Compositor = new Compositor()
  entities = new Set<Entity>()
  tiles = new Matrix()
  // tileCollider = new TileCollider(this.tiles)

  update(deltaTime: number) {
    this.entities.forEach(entity => {
      entity.update(deltaTime)
      // why not in update?
      entity.pos.x += entity.vel.x * deltaTime
      // this.tileCollider.checkX(entity)
      entity.pos.y += entity.vel.y * deltaTime
      // this.tileCollider.checkY(entity)
      entity.vel.y += this.gravity * deltaTime
    })
  }
}