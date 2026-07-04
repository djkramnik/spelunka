import Entity from './entity'
import Matrix from './matrix'
import TileResolver from './tileresolver'

export default class TileCollider {
  tiles: TileResolver
  constructor(m: Matrix, tileSize: number = 16) {
    this.tiles = new TileResolver(m, tileSize)
  }
  checkX(entity: Entity) {
    const posVelX = entity.vel.x > 0
    const negVelX = entity.vel.x < 0
    if (!posVelX && !negVelX) {
      return
    }
    const x = posVelX
      ? entity.pos.x + entity.size.x
      : entity.pos.x

    const touchingTiles = this.tiles.searchByRange(
      x, x, entity.pos.y, entity.pos.y + entity.size.y
    )
    for(const tile of touchingTiles) {
      if (tile.tile !== 'ground') {
        continue
      }
      if (posVelX) {
        if (entity.pos.x + entity.size.x > tile.x1) {
          entity.pos.x = tile.x1 - entity.size.x
          entity.vel.x = 0
        }
      } else {
        if (entity.pos.x < tile.x2) {
          entity.pos.x = tile.x2
          entity.vel.x = 0
        }
      }
    }
  }

  checkY(entity: Entity) {
    const posVelY = entity.vel.y > 0
    const negVelY = entity.vel.y < 0

    if (!posVelY && !negVelY) {
      return
    }
    const y = posVelY
      ? entity.pos.y + entity.size.y
      : entity.pos.y

    const touchingTiles = this.tiles.searchByRange(
      entity.pos.x, entity.pos.x + entity.size.x, y, y
    )
    for(const tile of touchingTiles) {
      if (tile.tile !== 'ground') {
        continue
      }
      if (posVelY) {
        if (entity.pos.y + entity.size.y > tile.y1) {
          entity.pos.y = tile.y1 - entity.size.y
          entity.vel.y = 0
        }
      } else {
        if (entity.pos.y < tile.y2) {
          entity.pos.y = tile.y2
          entity.vel.y = 0
        }
      }
    }
  }
}