import { Stream } from "../stream"
import { isKeyword, isPunctuation, isOperator, isComment, isWhitespace, skipComments, isDigit, isIdentifierStart, isIdentifier, readWhile, readEscaped } from './utils'
import { TokenType, TokenPosition, IToken } from "./contracts";


export class Token implements IToken {

  constructor(
    public value: any,
    public type: TokenType,
    public position: TokenPosition
  ) {
  }

  public static make(char: string|number, type: TokenType, position: TokenPosition) {
    return new Token(char, type, position)
  }
}

export class Tokenizer {

  protected _current?: any = null
  protected _last?: any = null

  constructor(protected _stream: Stream) {}

  getStream() {
    return this._stream
  }

  getCurrentPosition(): TokenPosition {
    const stream: Stream = this.getStream()
    return {
      row: stream.line,
      column: stream.column
    }
  }

  peek(): Token {
    return this._current || (this._current = readNext(this))
  }

  previous(): Token {
    return this._last
  }

  next(): Token {
    const token = this._current
    this._current = null
    return this._last = token || readNext(this)
  }

  eof() {
    return this.peek() == null
  }

  error(message: string, ...args: any[]) {
    if (args[0] && args[0] instanceof Token) {
      const token: Token = args[0]
      const formattedMessage = `
        [message]: ${message}
        [line]: ${token.position.row}
        [column]: ${token.position.column -  token.value.length}
      `
      this.getStream().error(formattedMessage, ...args)
    }
    this.getStream().error(message, ...args)
  }
}

function readNext(tokenizer: Tokenizer): Token|null {
  readWhile(tokenizer, isWhitespace)
  const stream = tokenizer.getStream()
  if (stream.eof()) {
    return null
  }
  const char = stream.peek()
  if (isComment(char)) {
    skipComments(tokenizer)
    return readNext(tokenizer)
  }

  if (char == "'") {
    return readString(tokenizer)
  }
  if (char == '"') {
    return readString(tokenizer, true)
  }
  if (isDigit(char)) {
    return readDigit(tokenizer)
  }
  if (isIdentifierStart(char)) {
    return readIndentifier(tokenizer)
  }
  if (isPunctuation(char)) {
    return Token.make(
      stream.next(),
      TokenType.Punctuation,
      tokenizer.getCurrentPosition()
    )
  }
  if (isOperator(char)) {
    const value = readWhile(tokenizer, isOperator)
    return Token.make(value, TokenType.Operator, tokenizer.getCurrentPosition())
  }
  throw new Error(`Can't handle character ${char}`)
}


function readIndentifier(tokenizer: Tokenizer) {
  const identifier = readWhile(tokenizer, isIdentifier)
  const tokenType = isKeyword(identifier) ? TokenType.Keyword : TokenType.Identifier
  return Token.make(identifier, tokenType, tokenizer.getCurrentPosition())
}

function readString(tokenizer: Tokenizer, double: boolean = false) {
  const char = readEscaped(tokenizer, double ? '"' : "'")
  return Token.make(char, TokenType.String, tokenizer.getCurrentPosition())
}

function readDigit(tokenizer: Tokenizer) {
  let hasDot = false
  const num = readWhile(tokenizer, char => {
    if (char == ".") {
      if (hasDot) {
        return false
      }
      hasDot = true
      return true
    }
    return isDigit(char)
  })
  return Token.make(parseFloat(num), TokenType.Number, tokenizer.getCurrentPosition())
}
