import { AstNode } from "./node";

export enum AstNodeType {
  Bool = "Bool",
  Binary = "Binary",
  Export = "Export",
  Import = "Import",
  Module = "Module",
  Number = "Number",
  String = "String",
  Keyword = "Keyword",
  Function = "Function",
  Component = "Component",
  Primitive = "Primitive",
  Assignment = "Assignment",
  Identifier = "Identifier",
  VariableDeclaration = "VariableDeclaration"
}

export interface IAstNode<T, V> {
  type: T
  definition: V
  metadata?: any
}

export type ModuleNodeBody = IAstNode<AstNodeType, ImportNode>

export interface ModuleNode {
  path: string
  body?: ModuleNodeBody[]
}

export interface ImportNode {
  as?: string
  path: string
}

export interface ExportNode {
  value: string
}

export interface ExpressionNode<L, R> {
  left: L
  right?: R
  operator: string
}

export interface BinaryNode<L, R> extends ExpressionNode<L, R> {}

export interface ExpressionDeclarationNode {

}

export interface VariableDeclarationNode {
  type: any
  value: any
  isConstant: boolean
  isOptional: boolean
}

export interface FunctionDeclarationNode {
  identifier: string
  body: AstNode<AstNodeType, any>[]
  arguments: AstNode<AstNodeType, any>[]
}
