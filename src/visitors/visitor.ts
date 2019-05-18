import { BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression, GetExpression, SetExpression, ThisExpression, SuperExpression, TernaryExpression } from '../parser/expression'
import { PrintStmt, ExpressionStmt, VarStmt, BlockStmt, IfStmt, WhileStmt, FunctionStmt, ReturnStmt, ClassStmt } from '../parser/statement'

export interface ExprVisitor<R> {
  visitSetExpr(expr: SetExpression): R
  visitGetExpr(expr: GetExpression): R
  visitCallExpr(expr: CallExpression): R
  visitThisExpr(expr: ThisExpression): R
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
  visitPrintStmt(stmt: PrintStmt): R
  visitClassStmt(stmt: ClassStmt): R
  visitWhileStmt(stmt: WhileStmt): R
  visitReturnStmt(stmt: ReturnStmt): R
  visitFunctionStmt(stmt: FunctionStmt): R
  visitExpressionStmt(stmt: ExpressionStmt): R
}
