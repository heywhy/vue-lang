import { IAstNode } from "./contracts";

export class AstNode<T, V> implements IAstNode<T, V> {
  constructor(
    public type: T,
    public definition: V,
    public metadata?: any
  ) {}

  public static make<T, V>(type: T, body: V, metadata?: any) {
    return new AstNode(type, body, metadata)
  }
}
