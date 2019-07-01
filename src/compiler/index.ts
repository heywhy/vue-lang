import * as path from 'path'
import { Parser } from '../parser/parser'
import { Scanner } from '../tokenizer/scanner'
import { readFileSync } from 'fs'
import { Log } from '../tokenizer/logger'
import { Interpreter } from '../visitors/interpreter'
import { Resolver } from '../visitors/resolver'
import { Token } from '../tokenizer/token'
import { Stack } from '../utils/stack'

export class Compiler {

  static readonly SOURCE_EXT = '.vuel'
  private parsers: Map<string, Parser> = new Map()
  private scanners: Map<string, Scanner> = new Map()
  private exports: Map<string, Set<string>> = new Map()
  private interpreters: Stack<Interpreter> = new Stack()

  constructor(
    private readonly cwd: string,
    private readonly entries: string[]
  ) {}

  getExports(imports: Token[], file: string, relative?: string) {
    file = this.getPath(file, relative ? path.dirname(relative!) : '')
    if (!this.exports.has(file)) {
      this.process(file)
      const last = this.interpreters.peek()
      this.interpreters.pop()
      const prev = this.interpreters.peek()
      if (prev != null) {
        prev.globals.merge(last.globals, Array.from(imports.map(({lexeme}) => lexeme)!))
        last.locals.forEach((v, k) => prev.locals.set(k, v))
      }
    }
    return this.exports.get(file) as Set<string>
  }

  addExports(file: string, token: Token) {
    if (!this.exports.has(file)) {
      this.exports.set(file, new Set())
    }
    this.exports.get(file)!.add(token.lexeme)
  }

  compile(path: string) {

  }

  run(file: string) {

  }

  compileAndRun() {
    this.entries.forEach(file => {
      this.process(this.getPath(file))
    })
  }

  getPath(file: string, relative?: string) {
    const p = path.isAbsolute(file) ? file : path.join(relative || this.cwd, file)
    return p.endsWith(Compiler.SOURCE_EXT) ? p : p.concat(Compiler.SOURCE_EXT)
  }


  private process(file: string) {
    const parser = this.getParser(file)
    const stmts = parser.parse()
    if (Log.hadError) return
    const interpreter = new Interpreter(file)
    const resolver = new Resolver(this, interpreter, file)
    this.interpreters.push(interpreter)
    resolver.resolve(stmts)
    if (Log.hadError) return
    interpreter.interpret(stmts)
  }

  private getParser(file: string) {
    this.parsers.has(file)
      ? this.parsers.get(file)
      : this.parsers.set(file, new Parser(this.getScanner(file).scanTokens()))

    return this.parsers.get(file) as Parser
  }

  private getScanner(file: string) {
    this.scanners.has(file)
      ? this.scanners.get(file)
      : this.scanners.set(file, new Scanner(this.getContent(file)))

    return this.scanners.get(file) as Scanner
  }

  private getContent(file: string) {
    return readFileSync(file).toString()
  }
}
