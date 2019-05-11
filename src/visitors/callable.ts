import { Interpreter } from "./interpreter";
import { Environment } from "../environment";
import { FunctionStmt } from "../parser/statement";
import { ReturnError } from "../errors";

export class Callable {

  constructor(
    private readonly declaration: FunctionStmt,
    private readonly closure: Environment) { }

  invoke(interpreter: Interpreter, args: any[]) {
    const environment = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }
    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (e) {
      if (e instanceof ReturnError) {
        return e.value
      }
      throw e
    }
  }

  toString() {
    return "<fn " + this.declaration.name.lexeme + ">";
  }

  get arity() {
    return this.declaration.params.length
  }
}
