import { ExprVisitor, StmtVisitor } from "./visitor";
import { Expression, BinaryExpression, UnaryExpression, GroupingExpression, LiteralExpression, VariableExpression } from "../parser/expression";
import { Statement, PrintStmt } from "../parser/statement";

export class AstPrinter implements ExprVisitor<string> {
  print(stmts: Statement[]) {
    const vals: string[] = []
    stmts.forEach(stmt => vals.push(stmt.accept(this)))
    return vals.join('\n');
  }

  visitVariableExpr(expr: VariableExpression) {
    return '';
  }

  visitPrintStmt(stmt: PrintStmt) {
    return stmt.expression.accept(this)
  }

  visitExpressionStmt(stmt: PrintStmt) {
    return stmt.expression.accept(this)
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
