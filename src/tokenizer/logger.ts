import { Token } from './token'
import { TokenType } from './token-type'
import { RuntimeError } from '../errors'

export class Log {
  private static _hadError = false
  private static _hadRuntimeError = false

  static get hadError() {
    return this._hadError
  }

  static set hadError(state: boolean) {
    this._hadError = state
  }

  static get hadRuntimeError() {
    return this._hadRuntimeError
  }

  static runtimeError(err: RuntimeError, file?: string) {
    console.error(`${file ? file + ':' : ''}${err.token.line}:${err.token.column} - ${err.message}`)
    this._hadRuntimeError = true
  }

  static syntaxError(token: Token, message: string, file?: string) {
    if (token.type == TokenType.EOF) {
      this.report(token.line, token.column, ' at end', message, file)
    } else {
      this.report(token.line, token.column, ` at ${token.lexeme}`, message, file)
    }
  }

  static error(line: number, column: number, message: string) {
    Log.report(line, column, '', message)
  }

  private static report(line: number, column: number, where: string, message: string, file?: string) {
    console.error(`${file ? file + ':' : ''}${line}:${column} - Error${where}: ${message}`)
    this._hadError = true
  }
}
