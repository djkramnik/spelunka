enum KeydownState {
  PRESSED = 'PRESSED',
  RELEASED = 'RELEASED'
}

type KeyPressHandler = (keyDownState: KeydownState) => void

export default class InputHandlers {
  keyMap: Map<number, KeyPressHandler>
  keyStates: Map<number, KeydownState>

  private handleKeyboardEvent = this.handleEvent.bind(this)
  constructor() {
    this.keyMap = new Map<number, KeyPressHandler>()
    this.keyStates = new Map<number, KeydownState>()
  }

  addMapping(keyCode: number, handler: KeyPressHandler) {
    this.keyMap.set(keyCode, handler)
  }

  handleEvent(event: KeyboardEvent) {
    const { keyCode } = event
    const handler = this.keyMap.get(keyCode)
    if (!handler) {
      return
    }
    event.preventDefault()
    const keyState = event.type === 'keydown'
      ? KeydownState.PRESSED
      : KeydownState.RELEASED

    if (this.keyStates.get(keyCode) === keyState) {
      return
    }
    this.keyStates.set(keyCode, keyState)
    console.log(this.keyStates)

    handler(keyState)
  }

  startListeners() {
    window.addEventListener('keydown', this.handleKeyboardEvent)
    window.addEventListener('keyup', this.handleKeyboardEvent)
  }
  stopListeners() {
    window.removeEventListener('keydown', this.handleKeyboardEvent)
    window.removeEventListener('keyup', this.handleKeyboardEvent)
  }
}