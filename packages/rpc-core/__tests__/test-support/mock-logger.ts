

export default class MockLogger {
  stack = <LoggedActivity[]>[];

  log(...args: any[]): void {
    this._add('log', args);
  }

  error(...args: any[]): void {
    this._add('error', args);
  }

  getFirstMessage(): string {
    return this.getLogMessage(0);
  }

  getLastMessage(): string {
    return this.getLogMessage(this.stack.length - 1);
  }

  getLogMessage(ndx: number) {
    return (this.stack[ndx] || {} as LoggedActivity).message || '';
  }

  findMessage(match: string | ((msg: string) => boolean)): string {
    const matchFn = typeof match === 'string' ? (msg: string) => msg.indexOf(match) >= 0 : match;
    const res = this.stack.find(l => matchFn(l.message));
    return res ? res.message : '';
  }

  _add(level: 'log' | 'error', args: any[]): void {
    this.stack.push({ level, message: args.join(' ') });
  }
}

interface LoggedActivity {
  level: 'log' | 'error';
  message: string;
}