export enum TokenType {
  Bool = "Bool",
  Type = "Type",
  String = "String",
  Number = "Number",
  Element = "Element",
  Keyword = "Keyword",
  Operator = "Operator",
  Identifier = "Identifier",
  Punctuation = "Punctuation"
}

export interface TokenPosition {
  row: number
  column: number
}


export interface IToken {
  value: any
  type: TokenType
  position: TokenPosition
}
