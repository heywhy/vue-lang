import { Token } from "../tokenizer/token";


export class ParseError extends Error {}

export class RuntimeError extends Error {

  constructor(public readonly token: Token, message: string) {
    super(message);
  }
}


export class ReturnError extends Error {

  constructor(public readonly value: any) {
    super(undefined);
  }
}
