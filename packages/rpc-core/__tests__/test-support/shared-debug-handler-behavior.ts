import {buildDebugHandler } from "../../src/util/logging-support";
import MockLogger from "./mock-logger";
import {DebugHandler, RequestPayload, ResponsePayload} from "../../src/interfaces";
import {buildFakeRequestPayload, buildFakeResponsePayload} from "./fake-payload-support";


export function testTransportDebugHandlerSend(mockSendMessage: (debugHandler: DebugHandler, payload: RequestPayload | ResponsePayload) => void, expectExtraMatches?: string[]) {
  describe('shared-debug-handler-behavior', () => {
    test("log message send", async () => {
      const logger = new MockLogger();
      const payload = buildFakeRequestPayload('someTestMethod', 'weirdly99');
      payload.senderId = 'fakeDebugSender';
      expect(logger.stack.length).toBe(0);
      const debugHandler = buildDebugHandler('CurrentTransport', { logger }) as DebugHandler;
      await Promise.resolve(mockSendMessage(debugHandler, payload));
      expect(logger.stack.length).toBe(1);
      const msg = logger.getFirstMessage();
      expect(msg).toMatch(/Transport] TransportSendingPayload:/);
      expect(msg).toMatch(/"weirdly99"/);
      (expectExtraMatches || []).forEach(m => expect(msg).toMatch(m));
    });
  });
}

export function testTransportDebugHandlerReceive(mockReceiveMessage: (debugHandler: DebugHandler, payload: RequestPayload | ResponsePayload) => void, expectExtraMatches?: string[]) {
  describe('shared-debug-handler-behavior', () => {
    test("log message received", async () => {
      const logger = new MockLogger();
      const debugHandler = buildDebugHandler('CurrentTransport', { logger }) as DebugHandler;
      const payload = buildFakeRequestPayload('another');
      payload.senderId = 'fakeDebugSender';
      await Promise.resolve(mockReceiveMessage(debugHandler, payload));
      expect(logger.stack.length).toBe(1);
      const msg = logger.getLastMessage();
      expect(msg).toMatch(/Transport] TransportReceivingMessage:/);
      (expectExtraMatches || []).forEach(m => expect(msg).toMatch(m));
    });
  });
}

