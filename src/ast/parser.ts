import { Tokenizer } from "../tokenizer/tokenizer";
import { AstNode } from "./node";
import { parseToken } from "./utils";
import { AstNodeType, ModuleNode } from "./contracts";

export class Parser {

  constructor(
    protected tokenizer: Tokenizer,
    protected node: AstNode<AstNodeType.Module, ModuleNode>
  ) {}

  public getAst() {
    return this.node = parseToken(this.tokenizer)
  }
}
