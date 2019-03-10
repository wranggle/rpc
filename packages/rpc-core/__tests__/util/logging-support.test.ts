import {buildDebugHandler, MessageEchoTreatment} from "../../src/util/logging-support";
import MockLogger from '../test-support/mock-logger';
import {buildFakeRequestPayload} from "../test-support/fake-payload-support";
import {DebugHandler, LogActivity} from "../../src/interfaces";

describe('@wranggle/rpc-core/util/debug-support', () => {
  let logger;


  beforeEach(() => {
    logger = new MockLogger();
  });

  describe('default DebugHandler', () => {
    test('submit debug message to passed-in logger option', () => {
      const debugHandler = buildDebugHandler('HelloHandler', { logger }) as DebugHandler;
      debugHandler({ activity: LogActivity.TransportSendingPayload, anyInfo: 'aa11bb22' });
      expect(logger.stack.length).toBe(1);
      const msg = logger.getLastMessage();
      expect(msg).toMatch(/^\[HelloHandler] TransportSendingPayload:/);
      expect(msg).toMatch(/aa11bb22/);
    });

    test('messageEcho option "Summarize"', () => {
      const debugHandler = buildDebugHandler('TestDebugHandler', {
        messageEcho: MessageEchoTreatment.Summarize,
        logger
      }) as DebugHandler;
      const payload = buildFakeRequestPayload('whatever', 'summaryShouldNotBeDisplayThis');
      payload.senderId = 'sender001';
      debugHandler({
        activity: LogActivity.TransportReceivingMessage,
        endpointSenderId: 'sender001',
        payload
      });
      const msg = logger.getLastMessage();
      expect(msg).toMatch(/ignoring echo/i);
      expect(msg).not.toMatch(/summaryShouldNotBeDisplayThis/);
      expect(msg).toMatch(/endpoint "sender001"/);
    });

    test('option "minimal" ignores payload received message', () => {
      const debugHandler = buildDebugHandler('TestDebugHandler', {
        minimal: true,
        logger
      }) as DebugHandler;
      debugHandler({
        activity: LogActivity.TransportReceivingMessage,
        some: 'data',
      });
      expect(logger.stack.length).toBe(0);
    });
  });

  describe('buildDebugHandler', () => {

    test('should assume debug disabled', () => {
      expect(buildDebugHandler('SomeClass', void(0))).toBe(false);
    });

  });
});
