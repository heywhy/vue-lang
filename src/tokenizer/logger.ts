export class Log {
  static error(line: number, message: string) {
    Log.report(line, '', message);
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line: ${line}] Error${where}: ${message}`);
  }
}
