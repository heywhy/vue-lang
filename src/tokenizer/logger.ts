import { Token } from "./token";
import { TokenType } from "./token-type";

export class Log {
  static syntaxError(token: Token, message: string) {
    if (token.type == TokenType.EOF) {
      this.report(token.line, ' at end', message);
    } else {
      this.report(token.line, ` at '${token.lexeme}'`, message);
    }
  }

  static error(line: number, message: string) {
    Log.report(line, '', message);
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line: ${line}] Error${where}: ${message}`);
  }
}
