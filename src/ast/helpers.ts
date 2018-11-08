import { TokenType } from "../tokenizer/contracts";
import { Tokenizer, Token } from "../tokenizer/tokenizer";
import { isDeclarationKW, getTokenValue } from "../tokenizer/utils";
import { AstNodeType } from "./contracts";
import { Dictionary } from "..";

export const OPERATOR_PRECEDENCE: Dictionary<number> = {
  "=": 1,
  "||": 2,
  "&&": 3,
  "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
  "+": 10, "-": 10,
  "*": 20, "/": 20, "%": 20,
}

export function skipKeyword(tokenizer: Tokenizer, kw: string) {
  const token = tokenizer.peek()
  if (isKeyword(token) && isTokenValue(token, kw)) {
    tokenizer.next()
  }
  return tokenizer
}

export function skipPunctuation(tokenizer: Tokenizer, punc: string) {
  const token = tokenizer.peek()
  if (isPunctuation(token) && isTokenValue(token, punc)) {
    tokenizer.next()
  }
  return tokenizer
}

export function skipOperator(tokenizer: Tokenizer, punc: string) {
  const token = tokenizer.peek()
  if (isOperator(token) && isTokenValue(token, punc)) {
    tokenizer.next()
  }
  return tokenizer
}

export function isPrimitive(token: Token) {
  return isTokenType(token, TokenType.String) ||
    isTokenType(token, TokenType.Number) ||
    isBool(token)
}

export function isBool(token: Token) {
  return isTokenType(token, TokenType.Keyword) &&
    (isTokenValue(token, 'true') || isTokenValue(token, 'false'))
}

export function isKeyword(token: Token, declaration: boolean = false) {
  const isKW = isTokenType(token, TokenType.Keyword)
  return !declaration ? isKW : isKW && isDeclarationKW(getTokenValue(token))
}

export function isTokenType(token: Token, type: TokenType) {
  return token.type === type
}

export function isIdentifier(token: Token) {
  return isTokenType(token, TokenType.Identifier)
}

export function isOperator(token: Token) {
  return isTokenType(token, TokenType.Operator)
}

export function isTokenValue(token: Token, value: any) {
  return token.value == value
}

export function isPunctuation(token: Token) {
  return isTokenType(token, TokenType.Punctuation)
}

export function tokenToNodeType(token: Token) {
  const type = token.type
  switch(type) {
    case TokenType.String:
      return AstNodeType.String;
    case TokenType.Number:
      return AstNodeType.Number
    case TokenType.Keyword:
      const value = getTokenValue(token)
      return value == 'true' || value == 'false'
        ? AstNodeType.Bool : AstNodeType.Keyword
    case TokenType.Identifier:
      return AstNodeType.Identifier
    default:
      throw new Error(`No equivalent node type for ${type}`)
  }
}
