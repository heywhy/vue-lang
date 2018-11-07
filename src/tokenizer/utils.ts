import { Tokenizer, Token } from "./tokenizer";
import { TokenType } from "./contracts";
import { isBool } from "../ast/helpers";

type Predicate = (char: string) => boolean

const keywords = [
  'const', 'state', 'component', 'store',
  'module', 'if', 'else', 'true', 'false',
  'return', 'import', 'from', 'export', 'in',
  'break', 'case', 'try', 'catch', 'for', 'throw',
  'continue', 'do', 'instanceof', 'new', 'while',
  //
  'any', 'string', 'number', 'bool'
]

const declarationKW = ['let', 'const']

export const isDeclarationKW = map(declarationKW.join(','))
export const isKeyword = map(keywords.concat(...declarationKW).join(','))

export const isPunctuation = map('.,@,:,(,),{,},[,],;', [','])

export const isOperator = map('+,-,*,/,%,=,&,|,<,>,!')

export const isType = map('string,number,boolean')

function map(str: string, extra: string[] = []) {
  const list: string[] = str.split(',').concat(...extra)
  return (char: string) => list.indexOf(char) >= 0
}

export function skipComments(tokenizer: Tokenizer) {
  readWhile(tokenizer, (char: string) => char != "\n")
  tokenizer.getStream().next()
}

export function isComment(char: string) {
  return char == "#"
}

export function isDigit(char: any) {
  return /[0-9]/i.test(char)
}

export function isWhitespace(char: string) {
  return " \t\n".indexOf(char) >= 0
}

export function isIdentifierStart(char: string) {
  return /[a-z_0-9]/i.test(char)
}

export function isIdentifier(char: string) {
  return isIdentifierStart(char)
  // || '?!-<>=0123456789'.indexOf(char) >= 0
}

export function isElementStart(char: string) {
  return char == '<'
}

export function readWhile(tokenizer: Tokenizer, callback: Predicate) {
  let str = ''
  const stream = tokenizer.getStream()
  while (!stream.eof() && callback(stream.peek())) {
    str += stream.next()
  }
  return str
}

export function readEscaped(tokenizer: Tokenizer, end: string) {
  let escaped = false
  let str = ""
  const stream = tokenizer.getStream()
  stream.next()
  while (!stream.eof()) {
    const char = stream.next()
    if (escaped) {
      str += char
      escaped = false
    } else if (char == "\\") {
      escaped = true
    } else if (char == end) {
      break
    } else {
      str += char
    }
  }
  return str
}

export function getTokenValue(token: Token) {
  switch (token.type) {
    case TokenType.Number:
      return parseFloat(token.value)
    case TokenType.String:
      return token.value
    case TokenType.Keyword:
      if (isBool(token)) {
        return token.value == 'true'
      }
    default:
      return token.value
  }
}

export function isAfterRow(prevToken: Token, nextToken: Token) {
  return nextToken.position.row > prevToken.position.row
}

export function isPreviousRow(prevToken: Token, nextToken: Token) {
  return !isAfterRow(prevToken, nextToken)
}
