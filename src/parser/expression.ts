import { Token } from "../tokenizer/token";
import { ExprVisitor } from "../visitors/visitor";

export abstract class Expression {
  abstract accept<R>(visitor: ExprVisitor<R>): R;
}

export class BinaryExpression extends Expression {
  constructor(
    public readonly left: Expression,
    public readonly operator: Token,
    public readonly right: Expression) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }
}


export class UnaryExpression extends Expression {
  constructor(
    public readonly operator: Token,
    public readonly right: Expression) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitUnaryExpr(this);
  }
}

export class GroupingExpression extends Expression {
  constructor(public readonly expression: Expression) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}


export class LiteralExpression extends Expression {
  constructor(public readonly value: any) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

export class VariableExpression extends Expression {
  constructor(public readonly name: Token) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitVariableExpr(this);
  }
}

export class AssignExpression extends Expression {
  constructor(
    public readonly name: Token,
    public readonly value: Expression) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitAssignExpr(this);
  }
}

export class LogicalExpression extends Expression {
  constructor(
    public readonly left: Expression,
    public readonly operator: Token,
    public readonly right: Expression) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }
}

export class CallExpression extends Expression {
  constructor(
    public readonly callee: Expression,
    public readonly paren: Token,
    public readonly args: Expression[]) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitCallExpr(this);
  }
}

export class GetExpression extends Expression {
  constructor(
    public readonly object: Expression,
    public readonly name: Token) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGetExpr(this);
  }
}

export class SetExpression extends Expression {
  constructor(
    public readonly object: Expression,
    public readonly name: Token,
    public readonly value: Expression) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitSetExpr(this);
  }
}

export class ThisExpression extends Expression {
  constructor(public readonly keyword: Token) {
    super()
  }

  accept<R>(visitor: ExprVisitor<R>) {
    return visitor.visitThisExpr(this)
  }
}

export class SuperExpression extends Expression {
  constructor(
    public readonly keyword: Token,
    public readonly method: Token) {
    super()
  }

  accept<R>(visitor: ExprVisitor<R>) {
    return visitor.visitSuperExpr(this)
  }
}
