import * as path from 'path'
import commander from 'commander'
import { generateAst } from './ast-generator';
import { existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline'
import { Scanner } from '../tokenizer/scanner'
import { Parser } from '../parser/parser';
import { Interpreter } from '../visitors/interpreter';
import { Resolver } from '../visitors/resolver';
import { Log } from '../tokenizer/logger';

commander.version('0.1.0')

commander.command('generate_ast <file>')
  .action((file: string) => {
    if (!path.isAbsolute(file)) {
      file = path.join(process.cwd(), file)
    }
    if (!existsSync(file)) {
      console.error(`[grammar file]: ${file} does not exist`)
      process.exit(1)
    }
    generateAst(file)
  })

commander.command('run <file>')
  .action((file: string) => {
    if (!existsSync(file)) {
      console.error(`${file} does not exist`)
      process.exit(1)
    }
    const content = readFileSync(file).toString()
    run(content)

    if (Log.hadError) process.exit(65);
    if (Log.hadRuntimeError) process.exit(70);
  })

commander.command('repl')
  .action(() => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    })
    readline.setPrompt('> ')
    readline.on('line', line => {
      run(line)
      Log.hadError = false
      readline.prompt()
    })
    readline.prompt()
  })

commander.parse(process.argv)

function run(code: string) {
  const scanner = new Scanner(code)
  const parser = new Parser(scanner.scanTokens())
  const stmts = parser.parse()
  if (Log.hadError) return
  const interpreter = new Interpreter()
  const resolver = new Resolver(interpreter);
  resolver.resolve(stmts);
  if (Log.hadError) return

  interpreter.interpret(stmts)
}
