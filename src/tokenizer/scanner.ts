import { Token } from "./token";
import { TokenType } from "./token-type";
import { Log } from "./logger";
import { keywords } from "./keywords";

export class Scanner {
  private source: string;
  private tokens: Token[] = [];
  private start: number = 0;
  private current: number = 0;
  private line: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      // We are at the beginning of the next lexeme.
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, '', null, this.line));
    return this.tokens;
  }

  private isAtEnd() {
    return this.current >= this.source.length;
  }

  private scanToken() {
    const char: string = this.advance();
    switch (char) {
      case '(':
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ')':
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case '{':
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case '}':
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ',':
        this.addToken(TokenType.COMMA);
        break;
      case '.':
        this.addToken(TokenType.DOT);
        break;
      case '-':
        this.addToken(TokenType.MINUS);
        break;
      case '+':
        this.addToken(TokenType.PLUS);
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON);
        break;
      case '*':
        this.addToken(TokenType.STAR);
        break;
      case '!':
        this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case '=':
        this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
        break;
      case '<':
        this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case '>':
        this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;
      case '/':
        if (this.match('/')) {
          // A comment goes until the end of the line.
          while (this.peek() != '\n' && !this.isAtEnd()) this.advance();
        } else if (this.match('*')) {
          while (
            !(this.peek() == '*' && this.match('*') &&
              this.peek() == '/' && this.match('/') &&
              this.peek() == '\n') && !this.isAtEnd()) {
            // increase the line if the current character is newline.
            if (this.peek() == '\n') this.line++;
            this.advance();
          }
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace.
        break;
      case '"':
        // case "'":
        this.string();
        break;
      case '\n':
        this.line++;
        break;
      case 'o':
        if (this.peek() == 'r') {
          this.addToken(TokenType.OR);
        }
        break;
      default:
        if (this.isDigit(char)) {
          this.number();
        } else if (this.isAlpha(char)) {
          this.identifier();
        } else {
          Log.error(this.line, "Unexpected character.");
        }
        break;
    }
  }

  private string() {
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == '\n') this.line++;
      this.advance();
    }

    // Unterminated string.
    if (this.isAtEnd()) {
      Log.error(this.line, "Unterminated string.");
      return;
    }

    // The closing ".
    this.advance();

    // Trim the surrounding quotes.
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.pushToken(TokenType.STRING, value);
  }

  private advance() {
    this.current++;
    return this.source.charAt(this.current - 1);
  }

  private addToken(type: TokenType) {
    this.pushToken(type, null);
  }

  private pushToken(type: TokenType, literal: any) {
    const text: string = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }

  private match(expected: string) {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) != expected) return false;

    this.current++;
    return true;
  }

  private peek() {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.current);
  }

  private isDigit(char: any) {
    return char >= '0' && char <= '9';
  }

  private number() {
    while (this.isDigit(this.peek())) this.advance();

    // Look for a fractional part.
    if (this.peek() == '.' && this.isDigit(this.peekNext())) {
      // Consume the "."
      this.advance();

      while (this.isDigit(this.peek())) this.advance();
    }

    this.pushToken(TokenType.NUMBER,
      Number.parseFloat(this.source.substring(this.start, this.current)));
  }

  private peekNext() {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  private identifier() {
    while (this.isAlphaNumeric(this.peek())) this.advance();
    // See if the identifier is a reserved word.
    const text: string = this.source.substring(this.start, this.current);

    let type: TokenType = keywords.get(text) as TokenType;
    if (type == null) type = TokenType.IDENTIFIER;
    this.addToken(type);
  }

  private isAlpha(char: string) {
    return (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char == '_';
  }

  private isAlphaNumeric(char: string) {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
