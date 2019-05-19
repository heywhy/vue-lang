import { ExprVisitor, StmtVisitor } from './visitor'
import { LiteralExpression, BinaryExpression, Expression, GroupingExpression, UnaryExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression, GetExpression, SetExpression, ThisExpression, SuperExpression, TernaryExpression, CommaExpression, AssignWithOpExpression } from '../parser/expression'
import { TokenType } from '../tokenizer/token-type'
import { Log } from '../tokenizer/logger'
import { Token } from '../tokenizer/token'
import { RuntimeError, ReturnError } from '../errors'
import { ExpressionStmt, PrintStmt, Statement, VarStmt, BlockStmt, IfStmt, WhileStmt, FunctionStmt, ReturnStmt, ClassStmt } from '../parser/statement'
import { Environment } from '../environment'
import { LangCallable, LangClass, ClassInstance, Callable, NativeFn } from './callable'

export class Interpreter implements ExprVisitor<Object>, StmtVisitor<void> {
  public readonly globals = new Environment()
  private environment = this.globals
  private readonly locals: Map<Expression, number> = new Map()

  constructor() {
    this.globals.define('clock', new NativeFn(() => {
      return Date.now() / 1000
    }, 'clock'))
  }

  resolve(expr: Expression, depth: number) {
    this.locals.set(expr, depth)
  }

  interpret(statements: Statement[]) {
    try {
      statements.forEach(stmt => this.execute(stmt))
    } catch (err) {
      Log.runtimeError(err)
    }
  }

  visitClassStmt(stmt: ClassStmt) {
    let superclass
    if (stmt.superclass != null) {
      superclass = this.evaluate(stmt.superclass)
      if (!(superclass instanceof LangClass)) {
        throw new RuntimeError(stmt.superclass.name, 'Superclass must be a class.')
      }
    }

    this.environment.define(stmt.name.lexeme, null)
    if (stmt.superclass != null) {
      this.environment = new Environment(this.environment)
      this.environment.define('super', superclass)
    }
    const fields: Map<string, Callable> = new Map()
    stmt.body.forEach(stmt1 => {
      if (stmt1 instanceof FunctionStmt) {
        const isInitializer = stmt1.name.lexeme == stmt.name.lexeme
        const callable = new LangCallable(stmt1, this.environment, isInitializer)
        fields.set(stmt1.name.lexeme, callable)
      }
    })
    if (!fields.has(stmt.name.lexeme)) {
      const decl: FunctionStmt = new FunctionStmt(stmt.name, [], [])
      fields.set(stmt.name.lexeme, new LangCallable(decl, this.environment, true))
    }
    const klass = new LangClass(stmt.name.lexeme, fields, superclass)
    if (superclass != null) {
      this.environment = this.environment.enclosing!
    }
    this.environment.assign(stmt.name, klass)
  }

  visitPrintStmt(stmt: PrintStmt) {
    const value = this.evaluate(stmt.expression)
    console.log(this.stringify(value))
  }

  visitExpressionStmt(stmt: ExpressionStmt) {
    this.evaluate(stmt.expression)
  }

  visitFunctionStmt(stmt: FunctionStmt) {
    const callable = new LangCallable(stmt, this.environment, false)
    this.environment.define(stmt.name.lexeme, callable)
  }

  visitIfStmt(stmt: IfStmt) {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch)
    } else if (stmt.elseBranch != null) {
      this.execute(stmt.elseBranch)
    }
  }

  visitWhileStmt(stmt: WhileStmt) {
    while (this.isTruthy(this.evaluate(stmt.condition)))
      this.execute(stmt.body)
  }

  visitBlockStmt(stmt: BlockStmt) {
    const env = stmt.newScope
      ? new Environment(this.environment) : this.environment
    this.executeBlock(stmt.statements, env)
  }

  visitVarStmt(stmt: VarStmt) {
    let value: any = null
    if (stmt.initializer != null) {
      value = this.evaluate(stmt.initializer)
    }

    this.environment.define(stmt.name.lexeme, value)
  }

  visitReturnStmt(stmt: ReturnStmt) {
    let value = null
    if (stmt.value != null) value = this.evaluate(stmt.value)

    throw new ReturnError(value)
  }

  visitCommaExpr(expr: CommaExpression) {
    let val: any
    expr.expressions.forEach(expr1 => {
      val = this.evaluate(expr1)
    })
    return val
  }

  visitTernaryExpr(expr: TernaryExpression) {
    if (this.isTruthy(this.evaluate(expr.condition))) {
      return this.evaluate(expr.thenBranch)
    }
    return this.evaluate(expr.elseBranch)
  }

  visitSuperExpr(expr: SuperExpression) {
    const distance = this.locals.get(expr)
    const superclass: LangClass = this.environment.getAt(distance!, 'super') as any
    const object: ClassInstance = this.environment.getAt(distance! - 1, 'this') as any
    const method: LangCallable = expr.isConstructorCall && !expr.method
      ? superclass.findField(superclass.name) as any
      : superclass.findField(expr.method!.lexeme) as any
    if (method == null) {
      throw new RuntimeError(expr.method!,
        `Undefined property '${expr.method!.lexeme }'.`)
    }
    return method.bind(object)
  }

  visitThisExpr(expr: ThisExpression) {
    return this.lookUpVariable(expr.keyword, expr)
  }

  visitSetExpr(expr: SetExpression) {
    const object = this.evaluate(expr.object)

    if (!(object instanceof ClassInstance)) {
      throw new RuntimeError(expr.name, 'Only instances have fields.')
    }

    const value = this.evaluate(expr.value)
    object.set(expr.name, value)
    return value
  }

  visitGetExpr(expr: GetExpression) {
    const ob = this.evaluate(expr.object)
    if (ob instanceof ClassInstance) {
      return ob.get(expr.name)
    }

    throw new RuntimeError(expr.name, 'Only instances have properties.')
  }

  visitCallExpr(expr: CallExpression): any {
    const callee = this.evaluate(expr.callee)

    const args: Object[] = []
    expr.args.forEach(ex => args.push(this.evaluate(ex)))
    if (!(callee instanceof Callable)) {
      throw new RuntimeError(expr.paren, 'Can only call functions and classes.')
    }
    const callable = callee as LangCallable
    if (args.length != callee.arity) {
      throw new RuntimeError(expr.paren,
        `Expected ${callee.arity} arguments but got ${args.length}.`)
    }
    return callable.invoke(this, args)
  }

  visitLogicalExpr(expr: LogicalExpression) {
    const left = this.evaluate(expr.left)

    if (expr.operator.type == TokenType.OR) {
      if (this.isTruthy(left)) return left
    } else {
      if (!this.isTruthy(left)) return left
    }

    return this.evaluate(expr.right)
  }

  visitAssignExpr(expr: AssignExpression) {
    const value = this.evaluate(expr.value)
    const distance = this.locals.get(expr)
    if (distance != null) {
      this.environment.assignAt(distance, expr.name, value)
    } else {
      this.globals.assign(expr.name, value)
    }
    return value
  }

  visitVariableExpr(expr: VariableExpression) {
    return this.lookUpVariable(expr.name, expr)
  }

  visitGroupingExpr(expr: GroupingExpression) {
    return this.evaluate(expr.expression)
  }

  visitLiteralExpr(expr: LiteralExpression) {
    return expr.value
  }

  visitUnaryExpr(expr: UnaryExpression) {
    const right: Object = this.evaluate(expr.right)
    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right)
      case TokenType.MINUS:
        return -right
    }

    return null as any
  }

  visitAssignWithOpExpr(expr: AssignWithOpExpression) {
    if (expr.left instanceof VariableExpression) {
      return this.visitAssignExpr(
        new AssignExpression(
          expr.left.name,
          new BinaryExpression(expr.left, expr.operator, expr.value)
        )
      )
    }
    if (expr.left instanceof GetExpression) {
      const {left} = expr
      return this.visitSetExpr(
        new SetExpression(
          left.object, left.name,
          new BinaryExpression(expr.left, expr.operator, expr.value)
        )
      )
    }
    console.log(expr)
    return null as any
  }

  visitBinaryExpr(expr: BinaryExpression) {
    const left = this.evaluate(expr.left)
    const right = this.evaluate(expr.right)

    switch (expr.operator.type) {
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right)
        return left > right
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return left >= right
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right)
        return left < right
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return left <= right
      case TokenType.MINUS:
      case TokenType.MINUS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) - (right as number)
      case TokenType.PLUS:
      case TokenType.PLUS_EQUAL:
        const hasString = typeof left === 'string' || typeof right === 'string'
        if (hasString) {
          return String(left) + String(right)
        }
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right
        }
        throw new RuntimeError(expr.operator,
          'Operands must be two numbers or two strings.')
      case TokenType.SLASH:
      case TokenType.SLASH_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        if (right === 0) throw new RuntimeError(expr.operator, 'Divisor by 0 error')
        return (left as number) / (right as number)
      case TokenType.STAR:
      case TokenType.STAR_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) * (right as number)
      case TokenType.AMPERSAND:
      case TokenType.AMPERSAND_EQUAL:
        this.checkNumberOperands(expr.operator, left, right)
        return (left as number) % (right as number)
      case TokenType.BANG_EQUAL: return !this.isEqual(left, right)
      case TokenType.EQUAL_EQUAL: return this.isEqual(left, right)
    }

    return null as any
  }

  private lookUpVariable(name: Token, expr: VariableExpression | ThisExpression) {
    const distance = this.locals.get(expr)
    if (distance != null) {
      return this.environment.getAt(distance, name.lexeme)
    } else {
      return this.globals.get(name)
    }
  }

  private execute(stmt: Statement) {
    stmt.accept(this)
  }

  public executeBlock(statements: Statement[], environment: Environment) {
    const previous = this.environment
    try {
      this.environment = environment
      statements.forEach(stmt => this.execute(stmt))
    } finally {
      this.environment = previous
    }
  }

  private evaluate(expr: Expression): Object {
    return expr.accept(this)
  }

  private isTruthy(val: Object) {
    if (val == null) return false
    if (typeof val === 'boolean') return val
    return true
  }

  private isEqual(left: Object, right: Object) {
    if (left == null && right == null) return true
    if (left == null) return false

    return left === right
  }

  private stringify(obj: Object) {
    if (obj == null) return 'nil'

    if (obj instanceof Number) {
      let text = obj.toString()
      if (text.endsWith('.0')) {
        text = text.substring(0, text.length - 2)
      }
      return text
    }

    return obj.toString()
  }

  private checkNumberOperands(operator: Token, left: object, right: object) {
    if (typeof left === 'number' && typeof right === 'number') return

    throw new RuntimeError(operator, 'Operands must be numbers.')
  }
}
