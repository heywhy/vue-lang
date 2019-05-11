
const {readFile} = require('fs')
const {Scanner} = require('./out/tokenizer/scanner')
const {Interpreter} = require('./out/visitors/interpreter')
const {AstPrinter} = require('./out/visitors/ast-printer')
const {Parser} = require('./out/parser/parser')

readFile('./test.vuel', (err, code) => {
  if (err) throw err

  const scanner = new Scanner(code.toString())
  const printer = new AstPrinter()
  const parser = new Parser(scanner.scanTokens())
  const stmts = parser.parse()
  const interpreter = new Interpreter()
  // console.log(stmts)
  // console.log(printer.print(stmts))

  interpreter.interpret(stmts)
})
