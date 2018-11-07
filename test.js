const {readFile} = require('fs')
const {Stream} = require('./out/stream')
const {Parser} = require('./out/ast/parser')
const {Tokenizer} = require('./out/tokenizer/tokenizer')

readFile('./main.vuel', (err, code) => {
  if (err) throw err

  const stream = new Stream(code.toString())
  const tokenizer = new Tokenizer(stream)
  let token = null
  // while (token = tokenizer.next()) {
  //   console.log(token)
  // }

  const parser = new Parser(tokenizer)
  console.log('========= AST =========')
  console.log(JSON.stringify(parser.getAst(), null, "  "))
})
