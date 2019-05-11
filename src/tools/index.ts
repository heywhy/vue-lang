import * as path from 'path'
import commander from 'commander'
import { generateAst } from './ast-generator';
import { existsSync } from 'fs';

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

commander.parse(process.argv)
