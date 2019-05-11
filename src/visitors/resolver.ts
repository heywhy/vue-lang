import { ExprVisitor, StmtVisitor } from "./visitor";
import { Interpreter } from "./interpreter";
import { BlockStmt, Statement, VarStmt, FunctionStmt, ExpressionStmt, IfStmt, PrintStmt, ReturnStmt, WhileStmt } from "../parser/statement";
import { Expression, VariableExpression, AssignExpression, BinaryExpression, CallExpression, GroupingExpression, LiteralExpression, LogicalExpression, UnaryExpression } from "../parser/expression";
import { Token } from "../tokenizer/token";
import { Stack } from "../uitls/stack";
import { Log } from "../tokenizer/logger";
import { FunctionType } from "./types";

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly scopes: Stack<Map<string, boolean>> = new Stack()
  private currentFunction: FunctionType = FunctionType.NONE

  constructor(private readonly interpreter: Interpreter) { }

  visitBlockStmt(stmt: BlockStmt) {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
  }

  visitVarStmt(stmt: VarStmt) {
    this.declare(stmt.name);
    if (stmt.initializer != null) {
      this.resolveExpr(stmt.initializer);
    }
    this.define(stmt.name);
  }

  visitVariableExpr(expr: VariableExpression) {
    if (!this.scopes.isEmpty() &&
      this.scopes.peek().get(expr.name.lexeme) == false) {
      Log.syntaxError(expr.name, 'Cannot read local variable in its own initializer.')
    }

    this.resolveLocal(expr, expr.name);
  }

  visitAssignExpr(expr: AssignExpression) {
    this.resolveExpr(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitFunctionStmt(stmt: FunctionStmt) {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }

  visitExpressionStmt(stmt: ExpressionStmt) {
    this.resolveExpr(stmt.expression);
  }

  visitIfStmt(stmt: IfStmt) {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.thenBranch);
    if (stmt.elseBranch != null) this.resolveStmt(stmt.elseBranch);
  }

  visitPrintStmt(stmt: PrintStmt) {
    this.resolveExpr(stmt.expression);
  }

  visitReturnStmt(stmt: ReturnStmt) {
    if (this.currentFunction == FunctionType.NONE) {
      Log.syntaxError(stmt.keyword, 'Cannot return from top-level code.');
    }
    if (stmt.value != null) {
      this.resolveExpr(stmt.value);
    }
  }

  visitWhileStmt(stmt: WhileStmt) {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
  }

  visitBinaryExpr(expr: BinaryExpression) {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitCallExpr(expr: CallExpression) {
    this.resolveExpr(expr.callee);
    expr.args.forEach(arg => this.resolveExpr(arg))
  }

  visitGroupingExpr(expr: GroupingExpression) {
    this.resolveExpr(expr.expression);
  }

  visitLiteralExpr(expr: LiteralExpression) { }

  visitLogicalExpr(expr: LogicalExpression) {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitUnaryExpr(expr: UnaryExpression) {
    this.resolveExpr(expr.right);
  }

  resolve(statements: Statement[]) {
    statements.forEach(stmt => this.resolveStmt(stmt))
  }

  private resolveFunction(fun: FunctionStmt, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope()
    fun.params.forEach(param => {
      this.declare(param);
      this.define(param);
    })
    this.resolve(fun.body);
    this.endScope();
    this.currentFunction = enclosingFunction
  }

  private resolveLocal(expr: Expression, name: Token) {
    for (let i = this.scopes.size() - 1; i >= 0; i--) {
      if (this.scopes.get(i).has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.size() - 1 - i);
        return;
      }
    }
  }

  private define(name: Token) {
    if (this.scopes.isEmpty()) return;
    this.scopes.peek().set(name.lexeme, true);
  }

  private declare(name: Token) {
    if (this.scopes.isEmpty()) return;
    const scope = this.scopes.peek();
    if (scope.has(name.lexeme)) {
      Log.syntaxError(name, 'Variable with this name already declared in this scope.')
    }
    scope.set(name.lexeme, false);
  }

  private beginScope() {
    this.scopes.push(new Map<string, boolean>())
  }

  private endScope() {
    this.scopes.pop()
  }

  private resolveStmt(stmt: Statement) {
    stmt.accept(this)
  }

  private resolveExpr(expr: Expression) {
    expr.accept(this)
  }
}
