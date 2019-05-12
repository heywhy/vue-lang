import { Token } from "../tokenizer/token";
import { Expression, BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression, GetExpression, SetExpression, ThisExpression } from "./expression";
import { TokenType } from "../tokenizer/token-type";
import { Log } from "../tokenizer/logger";
import { ParseError } from '../errors'
import { Statement, PrintStmt, ExpressionStmt, VarStmt, BlockStmt, IfStmt, WhileStmt, FunctionStmt, ReturnStmt, ClassStmt } from "./statement";

export class Parser {

  private current: number = 0;
  constructor(private readonly tokens: Token[]) { }

  public parse() {
    const statements: Statement[] = []
    while (!this.isAtEnd()) {
      statements.push(this.declaration() as Statement)
    }

    return statements;
  }

  private declaration() {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration()
      if (this.match(TokenType.FUN)) return this.functionDeclaration('function');
      if (this.match(TokenType.VAR)) return this.varDeclaration();

      return this.statement();
    } catch (err) {
      this.synchronize();
      return null;
    }
  }

  private classDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, 'Expect class name.');
    this.consume(TokenType.LEFT_BRACE, `Expect '{' after class.`)

    const methods: FunctionStmt[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.functionDeclaration("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");

    return new ClassStmt(name, methods);
  }

  private functionDeclaration(type: string) {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${type} name.`);
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${type} name.`);
    const parameters: Token[] = []
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 8) {
          this.error(this.peek(), "Cannot have more than 8 parameters.");
        }

        parameters.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${type} body.`);
    const body = this.block();
    return new FunctionStmt(name, parameters, body);
  }

  private varDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, 'Expect variable name.');

    let initializer: Expression;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new VarStmt(name, initializer!);
  }

  private statement() {

    if (this.match(TokenType.FOR)) return this.forStatement()
    if (this.match(TokenType.WHILE)) return this.whileStatement()
    if (this.match(TokenType.IF)) return this.ifStatement()
    if (this.match(TokenType.PRINT)) return this.printStatement()
    if (this.match(TokenType.RETURN)) return this.returnStatement()
    if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block())
    return this.expressionStatement()
  }

  private returnStatement() {
    const keyword = this.previous();
    let value!: Expression;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new ReturnStmt(keyword, value);
  }

  private forStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.")
    let initializer
    if (this.match(TokenType.SEMICOLON)) {
      initializer = null
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration()
    } else {
      initializer = this.expressionStatement()
    }
    let condition
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression()
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.")
    let increment;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");
    let body: Statement = this.statement()
    if (increment != null) {
      body = new BlockStmt([body, new ExpressionStmt(increment)]);
    }
    if (condition == null) condition = new LiteralExpression(true);
    body = new WhileStmt(condition, body);
    if (initializer != null) {
      body = new BlockStmt([initializer, body]);
    }
    return body
  }

  private whileStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.")
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after while condition.")
    const thenBranch: Statement = this.statement()
    return new WhileStmt(condition, thenBranch)
  }


  private ifStatement(): Statement {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch: Statement | undefined;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return new IfStmt(condition, thenBranch, elseBranch);
  }

  private printStatement() {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new PrintStmt(value);
  }

  private expressionStatement() {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new ExpressionStmt(expr);
  }

  private block() {
    const statements: Statement[] = []

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration() as Statement);
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
  }

  private expression() {
    return this.assignment()
  }

  private assignment(): Expression {
    let expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof VariableExpression) {
        const name = (<VariableExpression>expr).name;
        return new AssignExpression(name, value);
      } else if (expr instanceof GetExpression) {
        const get = expr;
        return new SetExpression(get.object, get.name, value);
      }

      this.error(equals, 'Invalid assignment target.');
    }

    return expr;
  }

  private or() {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new LogicalExpression(expr, operator, right);
    }

    return expr;
  }

  private and() {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new LogicalExpression(expr, operator, right);
    }

    return expr;
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

    return this.call() as Expression;
  }

  private call() {
    let expr: Expression = this.primary()
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expect property name after '.'.");
        expr = new GetExpression(expr, name);
      } else {
        break;
      }
    }
    return expr;
  }

  private finishCall(callee: Expression) {
    const args = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

    return new CallExpression(callee, paren, args);
  }

  private primary() {
    if (this.match(TokenType.FALSE)) return new LiteralExpression(false);
    if (this.match(TokenType.TRUE)) return new LiteralExpression(true);
    if (this.match(TokenType.NIL)) return new LiteralExpression(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new LiteralExpression(this.previous().literal);
    }

    if (this.match(TokenType.THIS)) return new ThisExpression(this.previous())

    if (this.match(TokenType.IDENTIFIER)) {
      return new VariableExpression(this.previous())
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
