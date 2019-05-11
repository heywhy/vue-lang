import { TokenType } from "./token-type";

export const keywords = new Map<string, TokenType>();

keywords.set('and',    TokenType.AND);
keywords.set('class',  TokenType.CLASS);
keywords.set('import',  TokenType.IMPORT);
keywords.set('expose',  TokenType.EXPOSE);
keywords.set('module',  TokenType.MODULE);
keywords.set('else',   TokenType.ELSE);
keywords.set('false',  TokenType.FALSE);
keywords.set('for',    TokenType.FOR);
keywords.set('fun',    TokenType.FUN);
keywords.set('if',     TokenType.IF);
keywords.set('nil',    TokenType.NIL);
keywords.set('or',     TokenType.OR);
keywords.set('print',  TokenType.PRINT);
keywords.set('return', TokenType.RETURN);
keywords.set('super',  TokenType.SUPER);
keywords.set('this',   TokenType.THIS);
keywords.set('true',   TokenType.TRUE);
keywords.set('var',    TokenType.VAR);
keywords.set('while',  TokenType.WHILE);
