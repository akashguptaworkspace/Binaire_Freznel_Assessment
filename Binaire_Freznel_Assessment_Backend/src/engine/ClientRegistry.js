import { EventEmitter } from 'node:events';
import { Client } from './Client.js';
import { NotFoundError } from '../util/errors.js';

// Map of connected clients. The deadlock guard uses it to reap tasks left
// behind by clients that disconnected.
export class ClientRegistry extends EventEmitter {
  #clients = new Map();

  register(label) {
    const client = new Client({ label });
    this.#clients.set(client.id, client);
    this.emit('change');
    return client;
  }

  get(id) {
    return this.#clients.get(id);
  }

  require(id) {
    const c = this.#clients.get(id);
    if (!c) throw new NotFoundError(`Unknown client ${id}`);
    return c;
  }

  // Like get(), but recreate the client from its id if it's missing. Used in
  // serverless, where a follow-up request can hit an instance that never saw
  // the original register call.
  ensure(id, label) {
    let c = this.#clients.get(id);
    if (!c) {
      c = new Client({ label });
      c.id = id;
      this.#clients.set(id, c);
      this.emit('change');
    }
    return c;
  }

  heartbeat(id) {
    const c = this.#clients.get(id);
    if (c) c.heartbeat();
    return c;
  }

  remove(id) {
    const c = this.#clients.get(id);
    if (c) {
      this.#clients.delete(id);
      this.emit('change');
    }
    return c;
  }

  list() {
    return [...this.#clients.values()];
  }

  get size() {
    return this.#clients.size;
  }

  toJSON() {
    return this.list().map((c) => c.toJSON());
  }
}

export default ClientRegistry;
