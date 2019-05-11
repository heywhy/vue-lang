import { ExprVisitor, StmtVisitor } from './visitor'
import { LiteralExpression, BinaryExpression, Expression, GroupingExpression, UnaryExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression } from '../parser/expression';
import { TokenType } from '../tokenizer/token-type';
import { Log } from '../tokenizer/logger';
import { Token } from '../tokenizer/token';
import { RuntimeError, ReturnError } from '../errors';
import { ExpressionStmt, PrintStmt, Statement, VarStmt, BlockStmt, IfStmt, WhileStmt, FunctionStmt, ReturnStmt } from '../parser/statement';
import { Environment } from '../environment';
import { Callable } from './callable';

export class Interpreter implements ExprVisitor<Object>, StmtVisitor<void> {
  public readonly globals = new Environment()
  private environment = this.globals;
  private readonly locals: Map<Expression, number> = new Map()

  resolve(expr: Expression, depth: number) {
    this.locals.set(expr, depth);
  }

  interpret(statements: Statement[]) {
    try {
      statements.forEach(stmt => this.execute(stmt))
    } catch (err) {
      Log.runtimeError(err);
    }
  }

  visitPrintStmt(stmt: PrintStmt) {
    const value = this.evaluate(stmt.expression)
    console.log(this.stringify(value))
  }

  visitExpressionStmt(stmt: ExpressionStmt) {
    this.evaluate(stmt.expression);
  }

  visitFunctionStmt(stmt: FunctionStmt) {
    const callable = new Callable(stmt, this.environment);
    this.environment.define(stmt.name.lexeme, callable);
    return null;
  }

  visitIfStmt(stmt: IfStmt) {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch != null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitWhileStmt(stmt: WhileStmt) {
    while (this.isTruthy(this.evaluate(stmt.condition)))
      this.execute(stmt.body)
  }

  visitBlockStmt(stmt: BlockStmt) {
    this.executeBlock(stmt.statements, new Environment(this.environment))
  }

  visitVarStmt(stmt: VarStmt) {
    let value: any = null;
    if (stmt.initializer != null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
  }

  visitReturnStmt(stmt: ReturnStmt) {
    let value = null;
    if (stmt.value != null) value = this.evaluate(stmt.value);

    throw new ReturnError(value);
  }

  visitCallExpr(expr: CallExpression): any {
    const callee = this.evaluate(expr.callee);

    const args: Object[] = []
    expr.args.forEach(ex => args.push(this.evaluate(ex)))
    if (!(callee instanceof Callable)) {
      throw new RuntimeError(expr.paren, 'Can only call functions and classes.')
    }
    const callable = callee as Callable;
    if (args.length != callee.arity) {
      throw new RuntimeError(expr.paren,
        `Expected ${callee.arity} arguments but got ${args.length}.`);
    }
    return callable.invoke(this, args);
  }

  visitLogicalExpr(expr: LogicalExpression) {
    const left = this.evaluate(expr.left);

    if (expr.operator.type == TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitAssignExpr(expr: AssignExpression) {
    const value = this.evaluate(expr.value);
    const distance = this.locals.get(expr);
    if (distance != null) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }
    return value;
  }

  visitVariableExpr(expr: VariableExpression) {
    return this.lookUpVariable(expr.name, expr)
  }

  visitGroupingExpr(expr: GroupingExpression) {
    return this.evaluate(expr)
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

  visitBinaryExpr(expr: BinaryExpression) {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return left > right;
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return left >= right;
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return left < right;
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return left <= right;
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left - <number>right;
      case TokenType.PLUS:
        const hasString = typeof left === 'string' || typeof right === 'string'
        if (hasString) {
          return String(left) + String(right)
        }
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right;
        }
        throw new RuntimeError(expr.operator,
          'Operands must be two numbers or two strings.')
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        if (right === 0) throw new RuntimeError(expr.operator, 'Divisor by 0 error')
        return <number>left / <number>right;
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left * <number>right;
      case TokenType.BANG_EQUAL: return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL: return this.isEqual(left, right);
    }

    return null as any
  }

  private lookUpVariable(name: Token, expr: VariableExpression) {
    const distance = this.locals.get(expr);
    if (distance != null) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  private execute(stmt: Statement) {
    stmt.accept(this);
  }

  public executeBlock(statements: Statement[], environment: Environment) {
    const previous = this.environment;
    try {
      this.environment = environment;
      statements.forEach(stmt => this.execute(stmt))
    } finally {
      this.environment = previous;
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
    if (left == null && right == null) return true;
    if (left == null) return false;

    return left === right;
  }

  private stringify(obj: Object) {
    if (obj == null) return "nil";

    // Hack. Work around Java adding ".0" to integer-valued doubles.
    if (obj instanceof Number) {
      let text = obj.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }

    return obj.toString();
  }

  private checkNumberOperands(operator: Token, left: object, right: object) {
    if (typeof left === 'number' && typeof right === 'number') return;

    throw new RuntimeError(operator, "Operands must be numbers.");
  }
}
