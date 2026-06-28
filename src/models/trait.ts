import type Entity from './entity'

export default class Trait {
  NAME: string

  constructor(name: string) {
    this.NAME = name;
  }

  update(obj: Entity, deltaTime: number) {
    console.warn('Unhandled update call in Trait');
  }
}