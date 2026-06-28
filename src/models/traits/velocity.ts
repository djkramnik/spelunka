import Trait from "../trait";
import type Entity from '../entity'

export default class Velocity extends Trait {
  constructor() {
    super('velocity')
  }
  update(entity: Entity, deltaTime: number) {
    entity.pos.x += entity.vel.x * deltaTime
    entity.pos.y += entity.vel.y * deltaTime
  }
}