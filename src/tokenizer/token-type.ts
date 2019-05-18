export enum TokenType {
  // Single-character tokens.
  LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
  LEFT_SQUARE_BRACKET, RIGHT_SQUARE_BRACKET, COMMA, DOT,
  MINUS, PLUS, SEMICOLON, SLASH,
  STAR, COLON, QUEST_MARK,

  // One or two character tokens.
  BANG, BANG_EQUAL,
  EQUAL, EQUAL_EQUAL,
  GREATER, GREATER_EQUAL,
  LESS, LESS_EQUAL,

  // Literals.
  IDENTIFIER, STRING, NUMBER,

  // Keywords.
  AND, CLASS, ELSE, EXPOSE, FALSE, FUN, FOR, IF, IMPORT, MODULE,
  NIL, OR, PRINT, RETURN, STATIC, SUPER, THIS, TRUE, VAR, WHILE,

  EOF
}
