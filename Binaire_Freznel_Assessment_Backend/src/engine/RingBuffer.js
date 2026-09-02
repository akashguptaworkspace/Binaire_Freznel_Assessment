// Fixed-capacity circular buffer, used for the "recently completed" list.
export class RingBuffer {
  #items;
  #capacity;
  #head = 0;
  #count = 0;

  constructor(capacity) {
    this.#capacity = Math.max(1, capacity | 0);
    this.#items = new Array(this.#capacity);
  }

  get size() {
    return this.#count;
  }

  push(value) {
    const idx = (this.#head + this.#count) % this.#capacity;
    if (this.#count < this.#capacity) {
      this.#items[idx] = value;
      this.#count += 1;
    } else {
      this.#items[this.#head] = value; // overwrite oldest
      this.#head = (this.#head + 1) % this.#capacity;
    }
  }

  // Newest first.
  toArray() {
    const out = [];
    for (let i = this.#count - 1; i >= 0; i -= 1) {
      out.push(this.#items[(this.#head + i) % this.#capacity]);
    }
    return out;
  }
}

export default RingBuffer;
