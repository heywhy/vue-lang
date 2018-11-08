import { AstNode } from "./node";
import { Tokenizer, Token } from "../tokenizer/tokenizer";
import { getTokenValue, isAfterRow } from "../tokenizer/utils";
import { TokenType } from "../tokenizer/contracts";
import { AstNodeType, ImportNode, ModuleNodeBody, ModuleNode, ExportNode, VariableDeclarationNode, ExpressionNode, FunctionDeclarationNode } from "./contracts";
import { isKeyword, isIdentifier, isPunctuation, isTokenValue, skipKeyword, skipPunctuation, isOperator, isPrimitive, tokenToNodeType, isTokenType, isBool } from "./helpers";

export function parseToken(tokenizer: Tokenizer): any {
  let token = tokenizer.peek()
  switch (token.type) {
    case TokenType.Keyword:
      return parseKeyword(tokenizer)
    case TokenType.Identifier:
      return parseIdentifier(tokenizer)
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
  if (isTokenValue(token, 'func')) {
    return parseFunction(tokenizer)
  }
  if (isPrimitive(token) && !isBool(token)) {
    const nodeType: TokenType = isTokenType(token, TokenType.String)
      ? TokenType.Number : TokenType.String
    return AstNode.make(nodeType, {value: getTokenValue(token)})
  }
  if (isBool(token)) {
    return AstNode.make(AstNodeType.Bool, {value: getTokenValue(tokenizer.next())})
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

function parseVarDeclaration(tokenizer: Tokenizer, kw: any) {
  skipKeyword(tokenizer, kw)
  const node: VariableDeclarationNode = {
    type: null,
    value: null,
    isOptional: false,
    isConstant: kw == 'const'
  }

  let token: Token = tokenizer.next()
  if (isIdentifier(token)) {
    node.value = getTokenValue(token)
  }
  skipPunctuation(tokenizer, ':')
  if (isKeyword(tokenizer.peek()) || isIdentifier(tokenizer.peek())) {
    node.type = getTokenValue(tokenizer.next())
  }
  token = tokenizer.peek()
  if (
    token &&
    !isAfterRow(tokenizer.previous(), token) &&
    (isOperator(token) || isPunctuation(token))
  ) {
    if (isPunctuation(token) && isTokenValue(token, '?')) {
      skipPunctuation(tokenizer, '?')
      token = tokenizer.peek()
      node.isOptional = true
    }
    if (isOperator(token)) {
      return parseOperator(
        tokenizer, AstNode.make(AstNodeType.VariableDeclaration, node)
      )
    }
  }

  return AstNode.make(AstNodeType.VariableDeclaration, node)
}

function parseIdentifier(tokenizer: Tokenizer) {
  let token = tokenizer.next()
  const node = AstNode.make(
    tokenToNodeType(token), {value: getTokenValue(token)}
  )
  token = tokenizer.peek()
  return token && isOperator(token)
    ? parseOperator(tokenizer, node) : node
}

function parseOperator(
  tokenizer: Tokenizer, leftNode: AstNode<AstNodeType, any>
) {
  let token = tokenizer.peek()
  const node: ExpressionNode<AstNode<AstNodeType, any>, any> = {
    right: null,
    left: leftNode,
    operator: getTokenValue(token)
  }
  tokenizer.next()
  token = tokenizer.peek()
  const nodeType = isTokenValue(tokenizer.previous(), '=')
    ? AstNodeType.Assignment : AstNodeType.Binary
  while (token &&
    !isAfterRow(tokenizer.previous(), token) &&
    !isPunctuation(tokenizer.peek())
  ) {
    if (isIdentifier(token) || isPrimitive(token)) {
      node.right = parseToken(tokenizer)
    }
    if (isOperator(token)) {
      node.right = parseOperator(tokenizer, node.right)
    }
    token = tokenizer.peek()
  }
  return AstNode.make(nodeType, node)
}

function throwWithTokenValue(tokenizer: Tokenizer, token: Token) {
  tokenizer.error(`Unexpected token found [${getTokenValue(token)}]`, token)
}

function parseFunction(tokenizer: Tokenizer) {
  skipKeyword(tokenizer, 'func')
  const parser = (t: Tokenizer) => parseVarDeclaration(t, null)

  const identifier = getTokenValue(tokenizer.next())
  const args = delimiters(tokenizer, '(', ')', ',', parser)
  const node: FunctionDeclarationNode = {
    identifier, body: [], arguments: args
  }
  let token = tokenizer.peek()
  if (token && isPunctuation(token) && isTokenValue(token, '{')) {
    node.body = delimiters(tokenizer, '{', '}', null as any, parseToken)
  }
  return AstNode.make(AstNodeType.Function, node)
}

function parseBlock(tokenizer: Tokenizer) {
  const nodes: AstNode<AstNodeType, any>[] = []
  skipPunctuation(tokenizer, '{')
  let token = tokenizer.peek()
  while (token) {
    nodes.push(parseToken(tokenizer))
  }
  skipPunctuation(tokenizer, '}')
  return nodes
}

function delimiters(
  tokenizer: Tokenizer,
  start: string,
  stop: string,
  separator: string,
  parser: (t: Tokenizer) => any
) {
  let first = true
  const nodes: AstNode<AstNodeType, any>[] = []
  skipPunctuation(tokenizer, start)
  while (!tokenizer.eof()) {
    let token = tokenizer.peek()
    if (isTokenType(token, TokenType.Punctuation) && isTokenValue(token, start)) {
      break
    }
    if (first) {
      first = false
    } else {
      skipPunctuation(tokenizer, separator)
    }
    if (isTokenType(token, TokenType.Punctuation) && isTokenValue(token, stop)) {
      break
    }
    // console.log(token, nodes)
    nodes.push(parser(tokenizer))
  }
  skipPunctuation(tokenizer, stop)

  return nodes
}
