import { BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression, GetExpression, SetExpression, ThisExpression, SuperExpression, TernaryExpression, CommaExpression } from '../parser/expression'
import { PrintStmt, ExpressionStmt, VarStmt, BlockStmt, IfStmt, WhileStmt, FunctionStmt, ReturnStmt, ClassStmt, BreakStmt, ContinueStmt, ImportStmt, ExposeStmt } from '../parser/statement'

export interface ExprVisitor<R> {
  visitSetExpr(expr: SetExpression): R
  visitGetExpr(expr: GetExpression): R
  visitCallExpr(expr: CallExpression): R
  visitThisExpr(expr: ThisExpression): R
  visitCommaExpr(expr: CommaExpression): R
  visitSuperExpr(expr: SuperExpression): R
  visitUnaryExpr(expr: UnaryExpression): R
  visitAssignExpr(expr: AssignExpression): R
  visitBinaryExpr(expr: BinaryExpression): R
  visitLiteralExpr(expr: LiteralExpression): R
  visitLogicalExpr(expr: LogicalExpression): R
  visitTernaryExpr(expr: TernaryExpression): R
  visitVariableExpr(expr: VariableExpression): R
  visitGroupingExpr(expr: GroupingExpression): R
}

export interface StmtVisitor<R> {
  visitIfStmt(stmt: IfStmt): R
  visitVarStmt(stmt: VarStmt): R
  visitBlockStmt(stmt: BlockStmt): R
  visitBreakStmt(stmt: BreakStmt): R
  visitPrintStmt(stmt: PrintStmt): R
  visitClassStmt(stmt: ClassStmt): R
  visitWhileStmt(stmt: WhileStmt): R
  visitReturnStmt(stmt: ReturnStmt): R
  visitContinueStmt(stmt: ContinueStmt): R
  visitFunctionStmt(stmt: FunctionStmt): R
  visitExpressionStmt(stmt: ExpressionStmt): R
}

export interface ModuleContextVisitor<R> extends StmtVisitor<R> {
  visitExposeStmt(stmt: ExposeStmt): R
  visitImportStmt(stmt: ImportStmt): R
}
