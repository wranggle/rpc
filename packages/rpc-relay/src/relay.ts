import {RequestPayload, ResponsePayload, RpcTransport} from "@wranggle/rpc-core/src/interfaces";
// @ts-ignore
import kvid from 'kvid';


export interface RelayOpts {

  /**
   * One of the two endpoints to bridge
   */
  left: RpcTransport;

  /**
   * One of the two endpoints to bridge
   */
  right: RpcTransport;

  /**
   * Optional. A random id will be used unless overridden here.
   * Value is added to payload transportMeta data, for debugging or potential examination by a custom transport.
   */
  relayId?: string;

  /**
   * A function for filtering out messages. When present, it must return `true` for the message to be relayed.
   */
  shouldRelay?: (payload: RequestPayload | ResponsePayload) => boolean;
}


export default class Relay {
  private _relayId!: string;
  private readonly _left: RpcTransport;
  private readonly _right: RpcTransport;
  private _shouldRelay?: ((payload: RequestPayload | ResponsePayload) => boolean) | void;


  constructor(opts: RelayOpts) {
    if (!opts.left || !opts.right) {
      throw new Error('Relay requires two transports, "left" and "right"');
    }
    opts.relayId = opts.relayId || kvid(10);

    this._left = opts.left;
    this._right = opts.right;
    this.opts(opts);
    this._shouldRelay = opts.shouldRelay;
    this.start(); // maybe an option to not start immediately
  }

  opts(opts: Partial<RelayOpts>) {
    if (opts.shouldRelay) {
      this._shouldRelay = opts.shouldRelay;
    }
    if (opts.relayId) {
      this._relayId = opts.relayId
    }
  }

  /**
   * In the middle layer, you instantiate and start the Relay.
   * When relaying, you do not create a WranggleRpc instance, since it does not make or respond to requests on its own.
   *
   */
  start() {
    this._startRelay(this._left, this._right);
    this._startRelay(this._right, this._left);
  }

  stopTransports() {
    this._left.stopTransport();
    this._right.stopTransport();
  }

  stopTransport(): void {
    this.stopTransports();
  }

  private _startRelay(from: RpcTransport, to: RpcTransport): void {
    from.listen((payload: RequestPayload | ResponsePayload) => {
      if (payload.protocol && _startsWith(payload.protocol, 'WranggleRpc')) { // todo: check against actual Protocol (move that out of internals dir)
        const relayId = this._relayId;
        if (!Array.isArray(payload.transportMeta.relays) || !payload.transportMeta.relays.find(r => r === relayId)) {
          payload.transportMeta.relays = (payload.transportMeta.relays || []).concat([ this._relayId ]);
          if (typeof this._shouldRelay !== 'function' || this._shouldRelay.call(null, payload) === true) {
            to.sendMessage(payload);
          }
        }
      }
    });
  }
}


function _startsWith(val: string, check: string) {
  return typeof val === 'string' && val.slice(0, check.length) === check;
}