import { readFile } from 'fs'

export function generateAst(file: string) {
  readFile(file, null, (err: NodeJS.ErrnoException|null, data: Buffer) => {
    if (err) throw err
    const content = data.toString()
    content.split('\n')
      .forEach(line => {

      })
  })
}
