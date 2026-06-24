export default class Timer {
  accumulatedTime: number
  lastTime: number
  deltaTime: number
  updateFn?: (delta: number) => void

  constructor(deltaTime: number = 1/60) {
    this.accumulatedTime = 0
    this.lastTime = 0
    this.deltaTime = deltaTime

  }
  updateProxy(time: number) {
    this.accumulatedTime += (time - this.lastTime) / 1000

    while(this.accumulatedTime > this.deltaTime) {
      this.update(this.deltaTime)
      this.accumulatedTime -= this.deltaTime
    }

    this.lastTime = time
    this.enqueue()
  }

  update(delta: number) {
    if (!this.updateFn) {
      console.warn('timer update is invoked but no updateFn is set')
    }
    this.updateFn?.(delta)
  }

  enqueue() { requestAnimationFrame(this.updateProxy.bind(this)) }
  start() { this.enqueue() }
}