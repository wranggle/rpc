import {DebugHandler, DebugHandlerActivityData, LogActivity} from "../interfaces";


export enum MessageEchoTreatment {
  Ignore = 'ignore',
  Summarize = 'summary',
  Display = 'display',
}

export interface DebugOpts {

  /**
   * Depending on the transport, an endpoint might receive the very message it just sent. This option lets you decide how
   * the builtin debugHandler treats such messages. Set to "Ignore" to ignore them, to "Summarize" to show a brief message,
   * or to "Display" to show the full payload.
   * Default is "Summarize"
   */
  messageEcho?: MessageEchoTreatment;

  minimal?: true;
  /**
   * Default is the console (eg, console.log, console.error) but you can provide an override with this option
   */
  logger?: Logger;
}

interface Logger {
  log(...args: any[]): void;
  // info(...args: any[]): void;
  // warn(...args: any[]): void;
  error(...args: any[]): void;
}


const DebugHandlerDefaultOpts = <Partial<DebugOpts>>{
  messageEcho: MessageEchoTreatment.Summarize,
};



export function buildDebugHandler(originator: string, opts: DebugHandler | DebugOpts  | boolean | void): DebugHandler | false{
  if (typeof originator !== 'string' || !originator.length) {
    throw new Error('Debug handler requires name/originator for activity');
  }
  if (typeof opts === 'function') {
    return opts;
  }
  if (!opts || opts === false) {
    return false;
  }
  if (opts === true) {
    opts = {};
  }
  opts = Object.assign({}, DebugHandlerDefaultOpts, opts) as DebugOpts;
  const logger = opts.logger || console;
  const { minimal, messageEcho } = opts;

  return function(data: DebugHandlerActivityData): void {
    const isSuppressedEcho = messageEcho !== MessageEchoTreatment.Display && _isReceivingPayloadEcho(data);
    if (isSuppressedEcho && messageEcho === MessageEchoTreatment.Ignore) {
      return;
    }
    const activity = data.activity || LogActivity.Misc;
    if (minimal && (activity !== LogActivity.ReportError && activity !== LogActivity.ReportWarning)) {
      return;
    }
    let msgParts = [
      `[${originator}] ${activity}: `
    ];
    data.message && msgParts.push(data.message);
    let shouldDisplayRawData = !data.skipPayload;
    if (isSuppressedEcho && messageEcho === MessageEchoTreatment.Summarize) {
      shouldDisplayRawData = false;
      msgParts.push(`Ignoring echo of received payload in endpoint "${data.endpointSenderId || '(not yet set)'}"`);
    }
    const err = data.error;
    delete data.error;
    shouldDisplayRawData && msgParts.push(_stringify(logger, data) || '{invalidData}');
    logger.log(msgParts.join(' '));
    if (err) {
      logger.error(err);
    }
  }
}


function _stringify(logger: Logger, data: any): string | void {
  try {
    return JSON.stringify(data, null, 2);
  } catch (err) {
    logger.error('Default debugHandler encountered error stringifying data:', err);
  }
}

function _isReceivingPayloadEcho(data: any): boolean {
  const { activity, endpointSenderId, payload } = data;
  return activity === LogActivity.TransportReceivingMessage &&
    endpointSenderId && payload &&
    payload.senderId === endpointSenderId;
}