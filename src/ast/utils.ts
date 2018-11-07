import { AstNode } from "./node";
import { Tokenizer, Token } from "../tokenizer/tokenizer";
import { getTokenValue, isAfterRow } from "../tokenizer/utils";
import { TokenType } from "../tokenizer/contracts";
import { AstNodeType, ImportNode, ModuleNodeBody, ModuleNode, ExportNode, VariableDeclarationNode, ExpressionNode, BinaryNode, ExpressionDeclarationNode } from "./contracts";
import { isKeyword, isIdentifier, isPunctuation, isTokenValue, skipKeyword, skipPunctuation, isOperator, skipOperator, isPrimitive, tokenToNodeType } from "./helpers";

export function parseToken(tokenizer: Tokenizer): any {
  let token = tokenizer.peek()
  switch (token.type) {
    case TokenType.Keyword:
      return parseKeyword(tokenizer)
    case TokenType.Operator:
      return parseOperator(tokenizer)
    case TokenType.Identifier:
      token = tokenizer.next()
      return AstNode.make(
        tokenToNodeType(token), {value: getTokenValue(token)}
      )
    case TokenType.Bool:
    case TokenType.String:
    case TokenType.Number:
      token = tokenizer.next()
      return AstNode.make(
        tokenToNodeType(token), {value: getTokenValue(token)}
      )
  }
  tokenizer.error(`Unknown token found. [${getTokenValue(token)}]`)
}


function parseKeyword(tokenizer: Tokenizer) {
  const token: Token = tokenizer.peek()
  if (isTokenValue(token, 'module')) {
    return parseModule(tokenizer)
  }
  if (isTokenValue(token, 'import')) {
    return parseImport(tokenizer)
  }
  // if (isTokenValue(token, 'export')) {
  //   return parseExport(tokenizer)
  // }
  if (isTokenValue(token, 'let') || isTokenValue(token, 'const')) {
    return parseVarDeclaration(tokenizer, getTokenValue(token))
  }

  tokenizer.error(
    `Unexpected token found after keyword. ${getTokenValue(token)}`, token
  )
}

function parseImport(tokenizer: Tokenizer) {
  skipKeyword(tokenizer, 'import')
  let token = tokenizer.peek()
  let path = ''
  let as = null
  let start = true;

  while (token && !isAfterRow(tokenizer.previous(), token)) {
    if (
      (!isKeyword(token) && !isIdentifier(token) && !isPunctuation(token))
      || (start && isPunctuation(token))) {
      throwWithTokenValue(tokenizer, token)
    }
    start = false
    const prevToken = tokenizer.previous()
    const isPuncNext = !isPunctuation(prevToken)
    token = tokenizer.next()
    if (isTokenValue(token, 'as') && !isPunctuation(prevToken)) {
      const nameToken = tokenizer.next()
      if (nameToken && isIdentifier(nameToken)) {
        as = getTokenValue(nameToken)
        break
      } else {
        const value = nameToken && getTokenValue(nameToken)
        tokenizer.error(`Expected an identifier but got [${value || ''}]`)
      }
      const value = (nameToken && getTokenValue(nameToken)) || 'nothing'
      tokenizer.error(`Expected and identifier but got [${value}]`)
    }
    if (!isPuncNext && isPunctuation(token)) {
      tokenizer.error('Expected a path but got punctuation!')
    }
    path += getTokenValue(token)
    token = tokenizer.peek()
  }
  if (path.endsWith('.')) {
    throw new Error()
  }

  let value: ImportNode = {as, path}

  return AstNode.make(AstNodeType.Import, value)
}

function parseModule(tokenizer: Tokenizer) {
  skipKeyword(tokenizer, 'module')
  let token: Token = tokenizer.peek()
  let starting = true
  let path: string = ''
  while (token && !isAfterRow(tokenizer.previous(), token)) {
    if (
      (!isPunctuation(tokenizer.previous()) && isKeyword(token)) &&
        !isIdentifier(token) &&
        !isPunctuation(token)
    ) {
      const tokenValue = getTokenValue(token)
      tokenizer.error(`Unexpected token found after keyword module: [${tokenValue}]`, token)
    }
    token = tokenizer.next()
    if (starting) {
      starting = false
      if (!isIdentifier(token)) {
        tokenizer.error('Expected an identifier after module keyword', token)
      }
    }
    path += getTokenValue(token)
    token = tokenizer.peek()
  }
  const body: ModuleNodeBody[] = []

  while (!tokenizer.eof()) {
    body.push(parseToken(tokenizer))
  }
  const value: ModuleNode = {body, path}

  return AstNode.make(AstNodeType.Module, value)
}


function parseExport(tokenizer: Tokenizer) {
  skipKeyword(tokenizer, 'export')
  let value: any = null
  if (tokenizer.peek()) {
    value = parseToken(tokenizer)
  }

  const def: ExportNode = {value}

  return AstNode.make(AstNodeType.Export, def)
}

function parseVarDeclaration(tokenizer: Tokenizer, kw: string) {
  skipKeyword(tokenizer, kw)
  const value: ExpressionNode<VariableDeclarationNode, any> = {
    left: {
      type: null,
      value: null,
      isConstant: kw == 'const'
    },
    operator: undefined
  }

  let token: Token = tokenizer.next()
  if (isIdentifier(token)) {
    value.left.value = getTokenValue(token)
  }
  skipPunctuation(tokenizer, ':')
  if (isKeyword(tokenizer.peek()) || isIdentifier(tokenizer.peek())) {
    value.left.type = getTokenValue(tokenizer.next())
  }
  token = tokenizer.peek()
  if (
    token &&
    !isAfterRow(tokenizer.previous(), token) &&
    isOperator(token)
  ) {
    const node = parseToken(tokenizer)
    if (tokenizer.peek()) {
      value.right = parseOperator(tokenizer, node)
    } else {
      value.right = node
    }
  }
  return AstNode.make(AstNodeType.VariableDeclaration, value)
}

type PrimitiveAstNode = AstNodeType.Identifier|AstNodeType.VariableDeclaration

function parseOperator(
  tokenizer: Tokenizer, leftNode: AstNode<PrimitiveAstNode, any>|null = null
) {
  const node: ExpressionNode<AstNode<any, any>, any> = {
    left: leftNode,
    operator: getTokenValue(tokenizer.next())
  }
  let token = tokenizer.peek()
  if (isIdentifier(token) || isPrimitive(token)) {
    node.right = parseToken(tokenizer)
  }
  console.log(token)
  if (isOperator(token)) {
    const nodeType = (leftNode &&
      (
        leftNode.type == AstNodeType.VariableDeclaration ||
        leftNode.type == AstNodeType.Identifier
      )) ? AstNodeType.Assignment : AstNodeType.Binary
      console.log(nodeType)
    node.right = parseOperator(
      tokenizer, AstNode.make(nodeType, node)
    )
  }

  return AstNode.make(AstNodeType.Binary, node)
}

function throwWithTokenValue(tokenizer: Tokenizer, token: Token) {
  tokenizer.error(`Unexpected token found [${getTokenValue(token)}]`, token)
}
