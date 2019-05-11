import { Expression } from "./expression";
import { StmtVisitor } from "../visitors/visitor";
import { Token } from "../tokenizer/token";

export abstract class Statement {

  abstract accept<R>(visitor: StmtVisitor<R>): R;
}

export class ExpressionStmt extends Statement {
  constructor(public readonly expression: Expression) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

export class PrintStmt extends Statement {
  constructor(public readonly expression: Expression) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

export class VarStmt extends Statement {
  constructor(
    public readonly name: Token,
    public readonly initializer: Expression) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}

export class BlockStmt extends Statement {
  constructor(public readonly statements: Statement[]) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}


export class IfStmt extends Statement {
  constructor(
    public readonly condition: Expression,
    public readonly thenBranch: Statement,
    public readonly elseBranch?: Statement) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

export class WhileStmt extends Statement {
  constructor(
    public readonly condition: Expression,
    public readonly body: Statement) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}

export class ForStmt extends Statement {
  constructor(
    public readonly initializer: Expression,
    public readonly condition: Expression,
    public readonly then: Expression,
    public readonly body: Statement
  ) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return null as any;
  }
}

export class FunctionStmt extends Statement {
  constructor(
    public readonly name: Token,
    public readonly params: Token[],
    public readonly body: Statement[]
  ) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitFunctionStmt(this);
  }
}

export class ReturnStmt extends Statement {
  constructor(
    public readonly keyword: Token,
    public readonly value: Expression
  ) {
    super()
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitReturnStmt(this);
  }
}
