import Trait from "./trait";
import Vec2 from "./vec";

export default class Entity {
  pos: Vec2
  vel: Vec2
  draw?: (ctx: CanvasRenderingContext2D) => void
  traits: Map<string, Trait>

  constructor() {
    this.pos = new Vec2(0, 0)
    this.vel = new Vec2(0, 0)
    this.traits = new Map<string, Trait>()
  }

  addTrait(trait: Trait) {
    this.traits.set(trait.NAME, trait)
  }

  update(deltaTime: number) {
    for(const t of this.traits.values()) {
      t.update(this, deltaTime)
    }
  }
}