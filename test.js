const {readFile} = require('fs')
const {Scanner} = require('./out/tokenizer/scanner')

readFile('./test.vuel', (err, code) => {
  if (err) throw err

  const scanner = new Scanner(code.toString())
  // while (token = tokenizer.next()) {
  //   console.log(token)
  // }
  scanner.scanTokens();
  console.log('========= AST =========')
  console.log(scanner)
  // console.log(JSON.stringify(parser.getAst(), null, "  "))
})
