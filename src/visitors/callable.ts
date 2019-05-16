import { Interpreter } from './interpreter'
import { Environment } from '../environment'
import { FunctionStmt, VarStmt } from '../parser/statement'
import { ReturnError, RuntimeError } from '../errors'
import { Token } from '../tokenizer/token'

export abstract class Callable {
  arity: number | undefined
  abstract toString(): string
  abstract invoke(interpreter: Interpreter, args: any[]): any
}

export class NativeFn extends Callable {
  constructor(
    private readonly fn: (...args: any[]) => any,
    private readonly name?: string) {
    super()
  }

  get arity() {
    return this.fn.length
  }

  invoke(interpreter: Interpreter, args: any[]) {
    return this.fn(...args)
  }

  toString() {
    return `<fn ${this.name || this.fn.name}>`
  }
}

export class LangCallable extends Callable {

  constructor(
    private readonly declaration: FunctionStmt,
    private readonly closure: Environment,
    private readonly isInitializer: boolean) {
    super()
  }

  invoke(interpreter: Interpreter, args: any[]) {
    const environment = new Environment(this.closure)
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i])
    }
    try {
      interpreter.executeBlock(this.declaration.body, environment)
    } catch (e) {
      if (e instanceof ReturnError) {
        if (this.isInitializer) return this.closure.getAt(0, 'this')
        return e.value
      }
      throw e
    }
    if (this.isInitializer) return this.closure.getAt(0, 'this')
  }

  bind(instance: ClassInstance) {
    const environment = new Environment(this.closure)
    environment.define('this', instance)
    return new LangCallable(this.declaration, environment, this.isInitializer)
  }

  toString() {
    return `<fn ${this.declaration.name.lexeme}>`
  }

  get arity() {
    return this.declaration.params.length
  }
}

export class LangClass extends Callable {
  constructor(
    public readonly name: string,
    public readonly fields: Map<string, Callable>,
    public readonly superclass?: LangClass) {
    super()
  }

  toString() {
    return `<class ${this.name}>`
  }

  get arity() {
    const initializer: LangCallable = this.findField(this.name) as any
    if (initializer == null) return 0
    return initializer.arity
  }

  invoke(interpreter: Interpreter, args: any[]) {
    const instance = new ClassInstance(this)
    const initializer: LangCallable = this.findField(this.name) as any
    if (initializer != null) {
      initializer.bind(instance).invoke(interpreter, args)
    }
    return instance
  }

  findField(name: string): Callable|null|undefined {
    if (this.fields.has(name)) {
      return this.fields.get(name)
    }

    if (this.superclass != null) {
      return this.superclass.findField(name)
    }

    return null
  }
}


export class ClassInstance {
  private readonly fields: Map<String, any> = new Map()
  constructor(private readonly klass: LangClass) { }

  get(name: Token) {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme)
    }

    const callable: LangCallable = this.klass.findField(name.lexeme) as any
    if (callable != null) return callable.bind(this)

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`)
  }

  set(name: Token, value: any) {
    this.fields.set(name.lexeme, value)
  }

  public toString() {
    return `<@${this.klass.name} instance>`
  }
}
