import { Token } from './tokenizer/token'
import { RuntimeError } from './errors'

export class Environment {
  private values: Map<string, object> = new Map()

  constructor(public readonly enclosing?: Environment) {}

  define(name: string, value: any) {
    this.values.set(name, value)
  }

  get(name: Token): any {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme)
    }
    if (this.enclosing != null) return this.enclosing.get(name)

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
  }

  assign(name: Token, value: any) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value)
      return
    }

    if (this.enclosing != null) {
      this.enclosing.assign(name, value)
      return
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
  }

  getAt(distance: number, name: string) {
    return this.ancestor(distance).values.get(name)
  }

  assignAt(distance: number, name: Token, value: any) {
    this.ancestor(distance).values.set(name.lexeme, value)
  }

  private ancestor(distance: number) {
    let environment: Environment = this
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing as any
    }

    return environment
  }
}
