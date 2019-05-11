import { Token } from "./token";
import { TokenType } from "./token-type";
import { RuntimeError } from "../errors";

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

  static runtimeError(err: RuntimeError) {
    // console.error(err)
    console.error(err.message + '\n[position => ' + err.token.line + ':' + err.token.column + ']');
    this._hadRuntimeError = true
  }

  static syntaxError(token: Token, message: string) {
    if (token.type == TokenType.EOF) {
      this.report(token.line, token.column, ' at end', message);
    } else {
      this.report(token.line, token.column, ` at '${token.lexeme}'`, message);
    }
  }

  static error(line: number, column: number, message: string) {
    Log.report(line, column, '', message);
  }

  private static report(line: number, column: number, where: string, message: string) {
    console.error(`[position => ${line}:${column}] Error${where}: ${message}`);
    this._hadError = true
  }
}
