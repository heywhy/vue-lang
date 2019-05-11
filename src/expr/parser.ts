import { Token } from "../tokenizer/token";
import { Expression, BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression } from "./expression";
import { TokenType } from "../tokenizer/token-type";
import { Log } from "../tokenizer/logger";

export class ParseError extends Error {}

export class Parser {

  private current: number = 0;
  constructor(private readonly tokens: Token[]) {}

  public parse() {
    try {
      return this.expression();
    } catch (err) {
      console.error(err)
      return null;
    }
  }

  private expression() {
    return this.equality()
  }

  private equality() {
    let expr: Expression = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator: Token = this.previous();
      const right: Expression = this.comparison();
      expr = new BinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private comparison() {
    let expr = this.addition();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.addition();
      expr = new BinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private addition() {
    let expr = this.multiplication();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.multiplication();
      expr = new BinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private multiplication() {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new BinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expression {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new UnaryExpression(operator, right);
    }

    return this.primary() as Expression;
  }

  private primary() {
    if (this.match(TokenType.FALSE)) return new LiteralExpression(false);
    if (this.match(TokenType.TRUE)) return new LiteralExpression(true);
    if (this.match(TokenType.NIL)) return new LiteralExpression(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new LiteralExpression(this.previous().literal);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new GroupingExpression(expr);
    }
    throw this.error(this.peek(), "Expect expression.");
  }

  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type == TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string) {
    Log.syntaxError(token, message);
    return new ParseError();
  }

  private match(...types: TokenType[]) {
    for (let i = 0; i < types.length; i++) {
      if (this.check(types[i])) {
        this.advance()
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType) {
    if (this.isAtEnd()) return false;
    return this.peek().type == type;
  }

  private advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd() {
    return this.peek().type == TokenType.EOF;
  }

  private peek() {
    return this.tokens[this.current];
  }

  private previous() {
    return this.tokens[this.current - 1];
  }
}
