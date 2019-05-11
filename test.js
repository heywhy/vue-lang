
const {readFile} = require('fs')
const {Scanner} = require('./out/tokenizer/scanner')
const {AstPrinter} = require('./out/expr/ast-printer')
const {Parser} = require('./out/expr/parser')

readFile('./test.vuel', (err, code) => {
  if (err) throw err

  const scanner = new Scanner(code.toString())
  const printer = new AstPrinter()
  const parser = new Parser(scanner.scanTokens())
  const expr = parser.parse()
  console.log(expr)
  // console.log(printer.print(expr))
})
