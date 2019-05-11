import { Visitor } from "./visitor";
import { Expression, BinaryExpression, UnaryExpression, GroupingExpression, LiteralExpression } from "./expression";

export class AstPrinter implements Visitor<string> {
  print(expr: Expression) {
    return expr.accept(this);
  }

  visitBinaryExpr(expr: BinaryExpression) {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitUnaryExpr(expr: UnaryExpression) {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }


  visitGroupingExpr(expr: GroupingExpression) {
    return this.parenthesize("group", expr.expression);
  }


  visitLiteralExpr(expr: LiteralExpression) {
    if (expr.value == null) return "nil";
    return expr.value.toString();
  }

  private parenthesize(name: string, ...exprs: Expression[]) {
    let str = '';
    str += `(${name}`
    exprs.forEach(expr => str += ` ${expr.accept(this)}`);
    str += ')';
    return str;
  }
}
