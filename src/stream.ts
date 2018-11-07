export class Stream {
  protected _line: number = 1
  protected _column: number = 0
  protected _position: number = 0

  constructor(protected code: string) {}

  get line() {
    return this._line
  }

  get column() {
    return this._column
  }

  next() {
    const char = this.code.charAt(this._position++)
    if (char == "\n") {
      this._line++
      this._column = 0
    } else {
      this._column++
    }
    return char
  }

  peek() {
    return this.code.charAt(this._position)
  }

  eof() {
    return this.peek() == ""
  }

  error(message: string, ...args: any[]) {
    throw new Error(message)
  }
}
