import { ExprVisitor, StmtVisitor } from './visitor'
import { Interpreter } from './interpreter'
import { BlockStmt, Statement, VarStmt, FunctionStmt, ExpressionStmt, IfStmt, PrintStmt, ReturnStmt, WhileStmt, ClassStmt, BreakStmt, ContinueStmt, ImportStmt, ExposeStmt } from '../parser/statement'
import { Expression, VariableExpression, AssignExpression, BinaryExpression, CallExpression, GroupingExpression, LiteralExpression, LogicalExpression, UnaryExpression, GetExpression, SetExpression, ThisExpression, SuperExpression, TernaryExpression, CommaExpression } from '../parser/expression'
import { Token } from '../tokenizer/token'
import { Stack } from '../utils/stack'
import { Log } from '../tokenizer/logger'
import { FunctionType, ClassType, LoopType } from './types'
import { Compiler } from '../compiler';

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly scopes: Stack<Map<string, boolean>> = new Stack()
  private currentFunction: FunctionType = FunctionType.NONE
  private currentClass: ClassType = ClassType.NONE
  private currentLoop: LoopType = LoopType.NONE

  constructor(
    private readonly compiler: Compiler,
    private readonly interpreter: Interpreter,
    private readonly path: string) { }

  visitImportStmt(stmt: ImportStmt) {
    const mod = this.compiler.getExports(stmt.exposes, stmt.path, this.path)
    stmt.exposes.forEach(name => {
      if (!mod.has(name.lexeme)) {
        Log.syntaxError(name, `Variable ${name.lexeme} not exposed by ${this.compiler.getPath(stmt.path)}`)
      }
      this.declare(name)
      this.define(name)
    })
  }

  visitExposeStmt(stmt: ExposeStmt) {
    const exports = this.compiler.getExports([], this.path)
    if (exports && exports.has(stmt.expose.lexeme)) {
      Log.syntaxError(stmt.expose, `Don't expose already exposed variable.`, this.path)
    }
    this.compiler.addExports(this.path, stmt.expose)
    this.resolveStmt(stmt.stmt!)
  }

  visitClassStmt(stmt: ClassStmt) {
    const enclosingClass = this.currentClass
    this.currentClass = ClassType.CLASS

    this.declare(stmt.name)
    this.define(stmt.name)

    if (stmt.superclass != null &&
      stmt.name.lexeme == stmt.superclass.name.lexeme) {
      Log.syntaxError(stmt.superclass.name, 'A class cannot inherit from itself.')
    }
    if (stmt.superclass != null) {
      this.currentClass = ClassType.SUBCLASS
      this.resolveExpr(stmt.superclass)
    }

    if (stmt.superclass != null) {
      this.beginScope()
      this.scopes.peek().set('super', true)
    }

    this.beginScope()
    this.scopes.peek().set('this', true)
    stmt.body.forEach(field => {
      if (field instanceof FunctionStmt) {
        let decl = FunctionType.METHOD
        if (field.name.lexeme == stmt.name.lexeme) {
          decl = FunctionType.INITIALIZER
        }
        this.resolveFunction(field, decl)
      }
    })
    this.endScope()
    if (stmt.superclass != null) this.endScope()
    this.currentClass = enclosingClass
  }

  visitBlockStmt(stmt: BlockStmt) {
    this.beginScope()
    this.resolve(stmt.statements)
    this.endScope()
  }

  visitVarStmt(stmt: VarStmt) {
    this.declare(stmt.name)
    if (stmt.initializer != null) {
      this.resolveExpr(stmt.initializer)
    }
    this.define(stmt.name)
  }

  visitCommaExpr(expr: CommaExpression) {
    expr.expressions.forEach(this.resolveExpr.bind(this))
  }

  visitTernaryExpr(expr: TernaryExpression) {
    this.resolveExpr(expr.condition)
    this.resolveExpr(expr.thenBranch)
    this.resolveExpr(expr.elseBranch)
  }

  visitThisExpr(expr: ThisExpression) {
    if (this.currentClass == ClassType.NONE) {
      Log.syntaxError(expr.keyword, "Cannot use 'this' outside of a class.")
      return
    }
    this.resolveLocal(expr, expr.keyword)
  }

  visitVariableExpr(expr: VariableExpression) {
    if (!this.scopes.isEmpty() &&
      this.scopes.peek().get(expr.name.lexeme) == false) {
      Log.syntaxError(expr.name, 'Cannot read local variable in its own initializer.')
    }

    this.resolveLocal(expr, expr.name)
  }

  visitAssignExpr(expr: AssignExpression) {
    this.resolveExpr(expr.value)
    this.resolveLocal(expr, expr.name)
  }

  visitFunctionStmt(stmt: FunctionStmt) {
    this.declare(stmt.name)
    this.define(stmt.name)

    this.resolveFunction(stmt, FunctionType.FUNCTION)
  }

  visitExpressionStmt(stmt: ExpressionStmt) {
    this.resolveExpr(stmt.expression)
  }

  visitIfStmt(stmt: IfStmt) {
    this.resolveExpr(stmt.condition)
    this.resolveStmt(stmt.thenBranch)
    if (stmt.elseBranch != null) this.resolveStmt(stmt.elseBranch)
  }

  visitPrintStmt(stmt: PrintStmt) {
    this.resolveExpr(stmt.expression)
  }

  visitReturnStmt(stmt: ReturnStmt) {
    if (this.currentFunction == FunctionType.NONE) {
      Log.syntaxError(stmt.keyword, 'Cannot return from top-level code.')
    }
    if (stmt.value != null) {
      if (this.currentFunction == FunctionType.INITIALIZER) {
        Log.syntaxError(stmt.keyword, 'Cannot return a value from an initializer.')
      }
      this.resolveExpr(stmt.value)
    }
  }

  visitWhileStmt(stmt: WhileStmt) {
    const enclosingLoop = this.currentLoop
    this.currentLoop = LoopType.LOOP
    this.resolveExpr(stmt.condition)
    this.resolveStmt(stmt.body)
    this.currentLoop = enclosingLoop
  }

  visitBreakStmt(stmt: BreakStmt) {
    if (this.currentLoop == LoopType.NONE) {
      Log.syntaxError(stmt.keyword, "Cannot use 'break' outside of a loop statement.")
    }
  }

  visitContinueStmt(stmt: ContinueStmt) {
    if (this.currentLoop == LoopType.NONE) {
      Log.syntaxError(stmt.keyword, "Cannot use 'continue' outside of a loop .")
    }
  }

  visitSuperExpr(expr: SuperExpression) {
    if (this.currentClass == ClassType.NONE) {
      Log.syntaxError(expr.keyword, "Cannot use 'super' outside of a class.")
    } else if (this.currentClass != ClassType.SUBCLASS) {
      Log.syntaxError(expr.keyword, "Cannot use 'super' in a class with no superclass.")
    }
    this.resolveLocal(expr, expr.keyword)
  }

  visitSetExpr(expr: SetExpression) {
    this.resolveExpr(expr.value)
    this.resolveExpr(expr.object)
  }

  visitGetExpr(expr: GetExpression) {
    this.resolveExpr(expr.object)
  }

  visitBinaryExpr(expr: BinaryExpression) {
    this.resolveExpr(expr.left)
    this.resolveExpr(expr.right)
  }

  visitCallExpr(expr: CallExpression) {
    this.resolveExpr(expr.callee)
    expr.args.forEach(arg => this.resolveExpr(arg))
  }

  visitGroupingExpr(expr: GroupingExpression) {
    this.resolveExpr(expr.expression)
  }

  visitLiteralExpr(expr: LiteralExpression) { }

  visitLogicalExpr(expr: LogicalExpression) {
    this.resolveExpr(expr.left)
    this.resolveExpr(expr.right)
  }

  visitUnaryExpr(expr: UnaryExpression) {
    this.resolveExpr(expr.right)
  }

  resolve(statements: Statement[]) {
    statements.forEach(stmt => this.resolveStmt(stmt))
  }

  private resolveFunction(fun: FunctionStmt, type: FunctionType) {
    const enclosingFunction = this.currentFunction
    this.currentFunction = type

    this.beginScope()
    fun.params.forEach(param => {
      this.declare(param)
      this.define(param)
    })
    this.resolve(fun.body)
    this.endScope()
    this.currentFunction = enclosingFunction
  }

  private resolveLocal(expr: Expression, name: Token) {
    for (let i = this.scopes.size() - 1; i >= 0; i--) {
      if (this.scopes.get(i).has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.size() - 1 - i)
        return
      }
    }
  }

  private define(name: Token) {
    if (this.scopes.isEmpty()) return
    this.scopes.peek().set(name.lexeme, true)
  }

  private declare(name: Token) {
    if (this.scopes.isEmpty()) return
    const scope = this.scopes.peek()
    if (scope.has(name.lexeme)) {
      Log.syntaxError(name, 'Variable with this name already declared in this scope.')
    }
    scope.set(name.lexeme, false)
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
