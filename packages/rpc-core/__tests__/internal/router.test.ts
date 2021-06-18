import pWaitFor from "p-wait-for";
import Router from '../../src/internal/router';
import RemoteRequest from '../../src/internal/remote-request';
import {buildFakeRequestPayload, buildFakeResponsePayload, DefaultFakeChannel,} from "../test-support/fake-payload-support";
import {
  RequestPayload,
  ResponsePayload,
  RpcTransport,
  EndpointInfo,
  TransportMessageHandler, RpcChannel
} from "../../src/interfaces";


describe('@wranggle/rpc-core/router', () => {


  describe('messages', () => {
    const FakeChannel = DefaultFakeChannel;
    const FakeLocalEndpoint = 'fakeLocalEndpoint01';
    let transport: MockTransport;
    let router: Router;
    let lastValidatedRequestReceived: any;


    const receiveFakeRequest = (methodName: string, ...userArgs: any[]) =>
      transport.fakeReceive(Object.assign(buildFakeRequestPayload(methodName, ...userArgs), { channel: FakeChannel, senderId: 'stubbedRemoteSender' }));

    const MockOnValidatedRequestHandler = (methodName: string, userArgs: any[]): Promise<any> => {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      lastValidatedRequestReceived = { methodName, userArgs, promise, resolve, reject } ;
      return promise;
    };

    const mockAndSetTransportAndRouter = (handler=MockOnValidatedRequestHandler): void => {
      transport = new MockTransport();
      router = new Router({ onValidatedRequest: handler});
      router.routerOpts({ transport, channel: FakeChannel, senderId: FakeLocalEndpoint });
    };

    beforeEach(() => {
      lastValidatedRequestReceived = null;
      mockAndSetTransportAndRouter();
    });

    describe('sending requests', () => {

      test('proper payload data over transport', async () => {
        const receipt = router.sendRemoteRequest(new RemoteRequest('boo', [ 1, 2 ], {}));
        await (receipt as any).promiseSent();
        expect(transport.sent.length).toBe(1);
        const payload = transport.sent[0] as RequestPayload;
        const { requestId, channel, senderId, protocol, methodName, userArgs, rsvp } = payload;
        expect(requestId.length).toBe(12);
        expect(channel).toBe(FakeChannel);
        expect(senderId).toBe(FakeLocalEndpoint);
        expect(protocol).toBe('WranggleRpc-1');
        expect(methodName).toBe('boo');
        expect(userArgs).toEqual([ 1, 2 ]);
        expect(rsvp).toBe(true);
      });

      test('returns RemotePromise', () => {
        const val = router.sendRemoteRequest(new RemoteRequest('aa', [], {}));
        expect(typeof val.then).toBe('function');
        expect(typeof val.isPending).toBe('function');
      });

      test('tracks pending requests', () => {
        expect(router.pendingRequestIds().length).toBe(0);
        router.sendRemoteRequest(new RemoteRequest('fn', [], { rsvp: true }));
        expect(router.pendingRequestIds().length).toBe(1);
      });

      test('does not track requests when rsvp disabled', () => {
        router.sendRemoteRequest(new RemoteRequest('fn', [], { rsvp: false }));
        expect(router.pendingRequestIds().length).toBe(0);
      });
    });

    describe('receiving requests', () => {
      test('pass validated message to request handler', () => {
        receiveFakeRequest('method_b', 22);
        expect(lastValidatedRequestReceived).toBeDefined();
        const { methodName, userArgs } = lastValidatedRequestReceived;
        expect(methodName).toBe('method_b');
        expect(userArgs).toEqual([ 22 ]);
      });

      test('send response when request handler resolves', async () => {
        receiveFakeRequest('someMethod', 'someArg');
        const { promise, resolve } = lastValidatedRequestReceived;
        const pendingRequestId = (transport.received[0] as RequestPayload).requestId;
        setTimeout(() => resolve('someResult'), 3);
        const val = await promise;
        expect(val).toBe('someResult');
        expect(transport.sent.length).toBe(1);
        const payload = transport.sent[0] as ResponsePayload;
        expect(payload.respondingTo).toBe(pendingRequestId);
        expect(payload.resolveArgs).toEqual([ 'someResult' ]);
      });

      test('send response when request handler rejects', async () => {
        receiveFakeRequest('someMethod', 'badArg');
        const { promise, reject } = lastValidatedRequestReceived;
        const pendingRequestId = (transport.received[0] as RequestPayload).requestId;
        setTimeout(() => reject('pretendingInvalidArg'), 3);
        let error;
        try {
          await promise;
        } catch (err) {
          error = err;
        }
        expect(error).toEqual('pretendingInvalidArg');
        await pWaitFor(() => transport.sent.length === 1);
        expect(transport.sent).toHaveLength(1);
        const payload = transport.sent[0] as ResponsePayload;
        expect(payload.respondingTo).toBe(pendingRequestId);
        expect(payload.error).toEqual('pretendingInvalidArg');
      });

      test('ignore duplicate requests', () => {
        receiveFakeRequest('twice', 11);
        expect(!!lastValidatedRequestReceived).toBe(true);
        lastValidatedRequestReceived = null;
        receiveFakeRequest('twice', 22);
        expect(!!lastValidatedRequestReceived).toBe(false);
      });
    });

    describe('receiving response', () => {
      const receiveFakeReply = (requestId: string, methodName: string, responseArgs=<any[]>[]) => {
        const responsePayload = buildFakeResponsePayload(methodName, ...responseArgs);
        responsePayload.respondingTo = requestId;
        transport.fakeReceive(responsePayload);
      };

      test('update pending request list', async () => {
        const pendingCount = () => router.pendingRequestIds().length;
        expect(pendingCount()).toBe(0);
        router.sendRemoteRequest(new RemoteRequest('any', [], {}));
        expect(pendingCount()).toBe(1);
        receiveFakeReply(router.pendingRequestIds()[0], 'any', []);
        expect(pendingCount()).toBe(0);
      });

      test('resolves RemotePromise', async () => {
        const remotePromise = router.sendRemoteRequest(new RemoteRequest('someGreeting', [], {}));
        setTimeout(() => {
          receiveFakeReply(router.pendingRequestIds()[0], 'someGreeting', [ null, 'howdy' ]);
        }, 3);
        const val = await remotePromise;
        expect(val).toBe('howdy');
      });

      test('ignore duplicate response messages', async () => {
        const remotePromise = router.sendRemoteRequest(new RemoteRequest('again', [], {}));
        const requestId = router.pendingRequestIds()[0];
        receiveFakeReply(requestId, 'again', [ null, 11 ]);
        let val = await remotePromise;
        receiveFakeReply(requestId, 'again', [ null, 22 ]);
        expect(transport.received.length).toBe(2);
        val = await remotePromise;
        expect(val).toBe(11);
      });
    });


    describe('preparseAllIncomingMessages', () => {
      const RejectionAllFilter = (rawPayload: Payload) => false;
      const PassAllFilter = (rawPayload: Payload) => true;
      const FakeSecurityTokenModificationFilter = (rawPayload: Payload): RequestPayload | boolean => {
        if (!(<any>rawPayload).requestId) {
          return true;
        }
        const payload = rawPayload as RequestPayload;
        const securityToken = payload.userArgs.shift();
        return securityToken === 'expectedToken' ? payload : false;
      };

      test('filter/reject', () => {
        router.routerOpts({ preparseAllIncomingMessages: PassAllFilter });
        router.routerOpts({ preparseAllIncomingMessages: RejectionAllFilter });
        receiveFakeRequest('bad', 'arg');
        expect(lastValidatedRequestReceived).toBeFalsy();
      });

      test('pass filters', () => {
        router.routerOpts({ preparseAllIncomingMessages: PassAllFilter });
        router.routerOpts({ preparseAllIncomingMessages: PassAllFilter });
        receiveFakeRequest('good');
        expect(!!lastValidatedRequestReceived).toBe(true);
        expect(lastValidatedRequestReceived.methodName).toBe('good');
      });

      test('custom modification', () => {
        router.routerOpts({ preparseAllIncomingMessages: FakeSecurityTokenModificationFilter });
        receiveFakeRequest('prependedMeta', 'expectedToken', 1, 2, 3);
        expect(!!lastValidatedRequestReceived).toBe(true);
        expect(lastValidatedRequestReceived.userArgs).toEqual([ 1, 2, 3 ]);
        lastValidatedRequestReceived = null;
        receiveFakeRequest('prependedMeta', 'badToken', 1, 2, 3);
        expect(lastValidatedRequestReceived).toBeFalsy();
      });
    });


    describe('ignoring other traffic on transport', () => {
      const receiveMessage = (changes: Partial<RequestPayload> | any) => transport.fakeReceive(Object.assign(buildFakeRequestPayload('someMethod', 'someArg'),
        { channel: FakeChannel, senderId: 'stubbedRemoteSender' }, changes));

      const wasValidated = () => !!lastValidatedRequestReceived;

      test('other rpc channel', () => {
        receiveMessage({ channel: 'otherChannel' });
        expect(wasValidated()).toBe(false);
        receiveMessage({});
        expect(wasValidated()).toBe(true);
      });

      test('malformed message payloads', () => {
        receiveMessage({ protocol: 'None' });
        expect(wasValidated()).toBe(false);
        receiveMessage({ requestId: null });
        expect(wasValidated()).toBe(false);
        receiveMessage({ senderId: null });
        expect(wasValidated()).toBe(false);
        expect(transport.received.length).toBe(3);
        receiveMessage({});
        expect(wasValidated()).toBe(true);
      });

      test('echo messages sent by itself', () => {
        receiveMessage({ senderId: FakeLocalEndpoint });
        expect(wasValidated()).toBe(false);
      });
    });

  });


});

type Payload = RequestPayload | ResponsePayload;
class MockTransport implements RpcTransport {
  sent = <Payload[]>[];
  received = <Payload[]>[];
  _onMessage?: (payload: Payload) => void;
  endpointSenderId!: string | void;

  // IRpcTransport methods:
  listen(msgHandler: TransportMessageHandler, channel: RpcChannel): void {
    this._onMessage = msgHandler;
  }
  sendMessage(payload: Payload): void {
    this.sent.push(payload);
  }
  stopTransport(): void {
  }

  // test-support methods:
  fakeReceive(payload: Payload) {
    this.received.push(payload);
    this._onMessage && this._onMessage(payload);
  }

}