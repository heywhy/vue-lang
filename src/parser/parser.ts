import { Token } from '../tokenizer/token'
import { Expression, BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression, GetExpression, SetExpression, ThisExpression, SuperExpression, TernaryExpression, CommaExpression } from './expression'
import { TokenType } from '../tokenizer/token-type'
import { Log } from '../tokenizer/logger'
import { ParseError } from '../errors'
import { Statement, PrintStmt, ExpressionStmt, VarStmt, BlockStmt, IfStmt, WhileStmt, FunctionStmt, ReturnStmt, ClassStmt, BreakStmt, ContinueStmt, ImportStmt, ExposeStmt } from './statement'

export class Parser {

  private current: number = 0
  constructor(private readonly tokens: Token[]) { }

  public parse() {
    const statements: Statement[] = []
    while (!this.isAtEnd()) {
      statements.push(this.declaration() as Statement)
    }

    return statements
  }

  private declaration() {
    try {

      if (this.match(TokenType.EXPOSE)) return this.exposeDeclaration()
      if (this.match(TokenType.CLASS)) return this.classDeclaration()
      if (this.match(TokenType.FUN)) return this.functionDeclaration('function')
      if (this.match(TokenType.VAR)) return this.varDeclaration()

      return this.statement()
    } catch (err) {
      this.synchronize()
      return null
    }
  }

  private classDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, 'Expect class name.')
    let fields: Statement[] = []
    let classFields: Statement[] = []
    let superClass: VariableExpression|undefined
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, 'Expect superclass name')
      superClass = new VariableExpression(this.previous())
    }

    this.consume(TokenType.LEFT_BRACE, "Expect '{' after class.")
    const decls: ExpressionStmt[] = []
    let construct: FunctionStmt|undefined
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const isStatic = this.match(TokenType.STATIC)
      const stmt = this.fieldDeclaration(name, isStatic);
      (isStatic ? classFields : fields).push(stmt)
      if (stmt instanceof FunctionStmt) {
        if (stmt.name.lexeme === name.lexeme) {
          construct = stmt
        }
      } else if (!isStatic && stmt instanceof ExpressionStmt && stmt.expression instanceof SetExpression) {
        decls.push(stmt)
      }
    }

    if (construct != null) {
      const [exprStmt] = construct.body
      if (!superClass) {
        construct.body.splice(0, 0, ...decls)
      } else if (superClass && exprStmt instanceof ExpressionStmt
        && exprStmt.expression instanceof CallExpression
        && exprStmt.expression.callee instanceof SuperExpression) {
        construct.body.splice(1, 0, ...decls)
      } else {
        return this.error(name, 'Expected super call!')
      }
    } else {
      construct = new FunctionStmt(name, [], [])
      construct.body.unshift(...decls)
      fields.push(construct)
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.")

    return new ClassStmt(name, superClass!, fields, classFields)
  }

  private fieldDeclaration(className: Token, isStatic: boolean) {
    if (this.check(TokenType.IDENTIFIER) && (
      this.peekNext().type === TokenType.COLON ||
      this.peekNext().type === TokenType.EQUAL ||
      this.peekNext().type === TokenType.SEMICOLON
    )) {
      const token = this.consume(TokenType.IDENTIFIER, '')
      this.match(TokenType.COLON)
      this.match(TokenType.IDENTIFIER)
      let value: Token|undefined
      if (this.match(TokenType.EQUAL) && this.match(TokenType.NUMBER, TokenType.STRING)) {
        value = this.previous()
      }
      const thisToken = new Token(
        TokenType.THIS, 'this', token.literal, token.line, token.column
      )
      const expr = new SetExpression(
        isStatic ? new VariableExpression(className) : new ThisExpression(thisToken),
        token,
        new LiteralExpression(value ? value.literal : null)
      )
      this.consume(TokenType.SEMICOLON, "Expect ';' after expression.")
      return new ExpressionStmt(expr)
    } else {
      return this.functionDeclaration('method')
    }
  }

  private functionDeclaration(type: string) {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${type} name.`)
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${type} name.`)
    const parameters: Token[] = []
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 8) {
          this.error(this.peek(), 'Cannot have more than 8 parameters.')
        }

        parameters.push(this.consume(TokenType.IDENTIFIER, 'Expect parameter name.'))
      } while (this.match(TokenType.COMMA))
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.")
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${type} body.`)
    const body = this.block()
    return new FunctionStmt(name, parameters, body)
  }

  private varDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, 'Expect variable name.')

    let initializer: Expression|undefined
    let type: Token|undefined
    if (this.match(TokenType.COLON)) {
      type = this.consume(TokenType.IDENTIFIER, 'Expected a type identifier.')
    }
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression()
      if (initializer instanceof CommaExpression) {
        const stmts: Statement[] = [
          new VarStmt(name, initializer.expressions.shift())
        ]

        const declare = (exprs: Expression[], stmts: Statement[]) => {
          exprs.forEach(expr => {
            if (expr instanceof CommaExpression) {
              declare(expr.expressions, stmts)
            } else if (expr instanceof AssignExpression) {
              stmts.push(new VarStmt(expr.name, expr.value))
            } else if (expr instanceof VariableExpression) {
              stmts.push(new VarStmt(expr.name))
            }
          })
        }

        declare(initializer.expressions, stmts)
        this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.")
        return new BlockStmt(stmts, false)
      }
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.")
    return new VarStmt(name, initializer, type)
  }

  private statement() {

    if (this.match(TokenType.IMPORT)) return this.importStatement()
    if (this.match(TokenType.FOR)) return this.forStatement()
    if (this.match(TokenType.WHILE)) return this.whileStatement()
    if (this.match(TokenType.IF)) return this.ifStatement()
    if (this.match(TokenType.PRINT)) return this.printStatement()
    if (this.match(TokenType.RETURN)) return this.returnStatement()
    if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block())
    if (this.match(TokenType.BREAK)) return this.breakStatement()
    if (this.match(TokenType.CONTINUE)) return this.continueStatement()
    return this.expressionStatement()
  }

  private exposeDeclaration() {
    const decl = this.declaration() as Statement

    if (decl instanceof ExpressionStmt && decl.expression instanceof VariableExpression) {
      return new ExposeStmt(decl.expression.name, decl)
    }
    if (decl instanceof FunctionStmt || decl instanceof VarStmt || decl instanceof ClassStmt) {
      return new ExposeStmt(decl.name, decl)
    }


    return this.error(this.previous(), 'Only variables, functions and classes that can be exposed.')
  }


  private importStatement() {
    const path = this.primary() as LiteralExpression
    if (!(path instanceof LiteralExpression)) {
      Log.syntaxError(this.previous(), 'Expected module path.')
    }

    const exposes: Token[] = []
    if (this.match(TokenType.EXPOSE)) {
      const exposeToken = this.previous()
      this.consume(TokenType.LEFT_PAREN, `Expect '(' after expose keyword.`)
      if (!this.check(TokenType.RIGHT_PAREN)) {
        do {
          exposes.push(this.consume(TokenType.IDENTIFIER, 'Expect identifier name.'))
        } while (this.match(TokenType.COMMA))
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after imported identifiers.")
      } else {
        Log.syntaxError(exposeToken, 'Expect identifiers to be imported from specified module!')
      }
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after import statement.")

    return new ImportStmt(path.value, exposes)
  }

  private breakStatement() {
    let id
    const keyword = this.previous()
    if (this.match(TokenType.IDENTIFIER)) {
      id = this.previous()
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after break statement.")
    return new BreakStmt(keyword, id)
  }

  private continueStatement() {
    let id
    const keyword = this.previous()
    if (this.match(TokenType.IDENTIFIER)) {
      id = this.previous()
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after continue statement.")
    return new ContinueStmt(keyword, id)
  }

  private returnStatement() {
    const keyword = this.previous()
    let value!: Expression
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression()
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.")
    return new ReturnStmt(keyword, value)
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
    let increment
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression()
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.")
    let body: Statement = this.statement()
    if (increment != null) {
      body = new BlockStmt([body, new ExpressionStmt(increment)])
    }
    if (condition == null) condition = new LiteralExpression(true)
    body = new WhileStmt(condition, body)
    if (initializer != null) {
      body = new BlockStmt([initializer, body], false)
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
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.")
    const condition = this.expression()
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.")

    const thenBranch = this.statement()
    let elseBranch: Statement | undefined
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement()
    }

    return new IfStmt(condition, thenBranch, elseBranch)
  }

  private printStatement() {
    const value = this.expression()
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.")
    return new PrintStmt(value)
  }

  private expressionStatement() {
    const expr = this.expression()
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.")
    return new ExpressionStmt(expr)
  }

  private block() {
    const statements: Statement[] = []

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration() as Statement)
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")
    return statements
  }

  private expression() {
    let expr = this.assignment()
    if (this.match(TokenType.COMMA)) {
      const exprs = [expr]
      while (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RIGHT_PAREN)) {
        exprs.push(this.expression())
      }
      return new CommaExpression(exprs)
    }
    return expr
  }

  private assignment(): Expression {
    let expr = this.or()

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous()
      const value = this.assignment()

      if (expr instanceof VariableExpression) {
        const name = expr.name
        return new AssignExpression(name, value)
      } else if (expr instanceof GetExpression) {
        const get = expr
        return new SetExpression(get.object, get.name, value)
      }

      this.error(equals, 'Invalid assignment target.')
    } if (this.match(TokenType.QUEST_MARK)) {
      const thenBranch = this.equality()
      this.consume(TokenType.COLON, "Expected ':'")
      expr = new TernaryExpression(expr, thenBranch, this.equality())
    } else if (
      this.match(
        TokenType.PLUS_EQUAL, TokenType.MINUS_EQUAL,
        TokenType.SLASH_EQUAL, TokenType.STAR_EQUAL,
        TokenType.AMPERSAND_EQUAL
      )
    ) {
      if (!(expr instanceof GetExpression) && !(expr instanceof VariableExpression)) {
        Log.syntaxError(this.previous(), 'Unexpected assignment operator!')
      }
      if (expr instanceof VariableExpression) {
        expr = new AssignExpression(
          expr.name,
          new BinaryExpression(expr, this.previous(), this.assignment())
        )
      }
      if (expr instanceof GetExpression) {
        expr = new SetExpression(
          expr.object, expr.name,
          new BinaryExpression(expr, this.previous(), this.assignment())
        )
      }
    }

    return expr
  }

  private or() {
    let expr = this.and()

    while (this.match(TokenType.OR)) {
      const operator = this.previous()
      const right = this.and()
      expr = new LogicalExpression(expr, operator, right)
    }

    return expr
  }

  private and() {
    let expr = this.equality()

    while (this.match(TokenType.AND)) {
      const operator = this.previous()
      const right = this.equality()
      expr = new LogicalExpression(expr, operator, right)
    }

    return expr
  }

  private equality() {
    let expr: Expression = this.comparison()

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator: Token = this.previous()
      const right: Expression = this.comparison()
      expr = new BinaryExpression(expr, operator, right)
    }

    return expr
  }

  private comparison() {
    let expr = this.addition()

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous()
      const right = this.addition()
      expr = new BinaryExpression(expr, operator, right)
    }

    return expr
  }

  private addition() {
    let expr = this.multiplication()

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous()
      const right = this.multiplication()
      expr = new BinaryExpression(expr, operator, right)
    }

    return expr
  }

  private multiplication() {
    let expr = this.unary()

    while (this.match(TokenType.SLASH, TokenType.STAR, TokenType.AMPERSAND)) {
      const operator = this.previous()
      const right = this.unary()
      expr = new BinaryExpression(expr, operator, right)
    }

    return expr
  }

  private unary(): Expression {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous()
      const right = this.unary()
      return new UnaryExpression(operator, right)
    }

    return this.call() as Expression
  }

  private call() {
    let expr: Expression = this.primary()
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr)
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expect property name after '.'.")
        expr = new GetExpression(expr, name)
      } else {
        break
      }
    }
    return expr
  }

  private finishCall(callee: Expression) {
    const args = []
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.expression())
      } while (this.match(TokenType.COMMA))
    }

    const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.")

    return new CallExpression(callee, paren, args)
  }

  private primary() {
    if (this.match(TokenType.FALSE)) return new LiteralExpression(false)
    if (this.match(TokenType.TRUE)) return new LiteralExpression(true)
    if (this.match(TokenType.NIL)) return new LiteralExpression(null)

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new LiteralExpression(this.previous().literal)
    }

    if (this.match(TokenType.SUPER)) {
      const keyword = this.previous()
      let isConstructorCall = false
      let method: Token|undefined
      if (this.check(TokenType.LEFT_PAREN)) {
        isConstructorCall = true
      } else {
        this.consume(TokenType.DOT, "Expect '.' after 'super'.")
        method = this.consume(TokenType.IDENTIFIER, 'Expect superclass method name')
      }
      return new SuperExpression(keyword, method, isConstructorCall)
    }

    if (this.match(TokenType.THIS)) return new ThisExpression(this.previous())

    if (this.match(TokenType.IDENTIFIER)) {
      return new VariableExpression(this.previous())
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression()
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.")
      return new GroupingExpression(expr)
    }
    const msg = this.previous().type === TokenType.IMPORT
      ? 'path' : 'expression'
    throw this.error(this.peek(), `Expect ${msg}.`)
  }

  private synchronize() {
    this.advance()

    while (!this.isAtEnd()) {
      if (this.previous().type == TokenType.SEMICOLON) return

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return
      }

      this.advance()
    }
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) return this.advance()

    throw this.error(this.peek(), message)
  }

  private error(token: Token, message: string) {
    Log.syntaxError(token, message)
    return new ParseError()
  }

  private match(...types: TokenType[]) {
    for (let i = 0; i < types.length; i++) {
      if (this.check(types[i])) {
        this.advance()
        return true
      }
    }
    return false
  }

  private check(type: TokenType) {
    if (this.isAtEnd()) return false
    return this.peek().type == type
  }

  private advance() {
    if (!this.isAtEnd()) this.current++
    return this.previous()
  }

  private isAtEnd() {
    return this.peek().type == TokenType.EOF
  }

  private peek() {
    return this.tokens[this.current]
  }

  private peekNext() {
    return this.tokens[this.current + 1]
  }

  private previous() {
    return this.tokens[this.current - 1]
  }
}
