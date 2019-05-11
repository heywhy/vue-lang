import { BinaryExpression, UnaryExpression, LiteralExpression, GroupingExpression } from "./expression";

export interface Visitor<R> {
  visitUnaryExpr(expr: UnaryExpression): R;
  visitBinaryExpr(expr: BinaryExpression): R;
  visitLiteralExpr(expr: LiteralExpression): R;
  visitGroupingExpr(expr: GroupingExpression): R;
}
