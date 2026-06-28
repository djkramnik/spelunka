import Trait from "../trait";
import type Entity from '../entity'

export default class Jump extends Trait {
  duration: number = 0.5
  engageTime: number = 0
  velocity: number = 200

  constructor() {
    super('jump')
  }
  start() {
    this.engageTime = this.duration
  }
  cancel() {
    this.engageTime = 0
  }
  update(entity: Entity, deltaTime: number) {
    if (this.engageTime > 0) {
      entity.vel.y = (this.velocity * -1)
      this.engageTime -= deltaTime
    }
  }
}