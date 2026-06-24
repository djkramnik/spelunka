import Vec2 from "./vec";

export default class Entity {
  pos: Vec2
  vel: Vec2
  draw?: (ctx: CanvasRenderingContext2D) => void
  update?: (delta: number) => void

  constructor() {
    this.pos = new Vec2(0, 0)
    this.vel = new Vec2(0, 0)
  }
}