import { BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression, VariableExpression, AssignExpression, LogicalExpression, CallExpression } from "../parser/expression";
import { PrintStmt, ExpressionStmt, VarStmt, BlockStmt, IfStmt, WhileStmt, ForStmt, FunctionStmt, ReturnStmt } from "../parser/statement";

export interface ExprVisitor<R> {
  visitCallExpr(expr: CallExpression): R;
  visitUnaryExpr(expr: UnaryExpression): R;
  visitAssignExpr(expr: AssignExpression): R;
  visitBinaryExpr(expr: BinaryExpression): R;
  visitLiteralExpr(expr: LiteralExpression): R;
  visitLogicalExpr(expr: LogicalExpression): R;
  visitVariableExpr(expr: VariableExpression): R;
  visitGroupingExpr(expr: GroupingExpression): R;
}

export interface StmtVisitor<R> {
  visitIfStmt(stmt: IfStmt): R;
  visitVarStmt(stmt: VarStmt): R;
  visitBlockStmt(stmt: BlockStmt): R;
  visitPrintStmt(stmt: PrintStmt): R;
  visitWhileStmt(stmt: WhileStmt): R;
  visitReturnStmt(stmt: ReturnStmt): R;
  visitFunctionStmt(stmt: FunctionStmt): R;
  visitExpressionStmt(stmt: ExpressionStmt): R;
}
