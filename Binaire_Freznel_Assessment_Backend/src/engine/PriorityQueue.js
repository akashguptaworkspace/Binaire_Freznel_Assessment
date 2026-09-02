// Binary min-heap. Order is decided by comparator(a, b) < 0 meaning a comes
// out first.
//
// Beyond a plain heap the scheduler needs:
//   remove(predicate) - for task cancellation
//   reheapify()       - after aging changes comparator keys
//   toArray()         - sorted snapshot for the UI
//
// A #position map (value -> index) keeps removal from the middle O(log n).
export class PriorityQueue {
  #heap = [];
  #comparator;
  #position = new Map();

  constructor(comparator) {
    if (typeof comparator !== 'function') {
      throw new TypeError('PriorityQueue requires a comparator function');
    }
    this.#comparator = comparator;
  }

  get size() {
    return this.#heap.length;
  }

  get isEmpty() {
    return this.#heap.length === 0;
  }

  peek() {
    return this.#heap[0];
  }

  push(value) {
    const idx = this.#heap.length;
    this.#heap.push(value);
    this.#position.set(value, idx);
    this.#siftUp(idx);
    return this.size;
  }

  pop() {
    if (this.#heap.length === 0) return undefined;
    const top = this.#heap[0];
    const last = this.#heap.pop();
    this.#position.delete(top);
    if (this.#heap.length > 0) {
      this.#heap[0] = last;
      this.#position.set(last, 0);
      this.#siftDown(0);
    }
    return top;
  }

  has(value) {
    return this.#position.has(value);
  }

  // Remove every element matching predicate; returns the removed items.
  remove(predicate) {
    const removed = [];
    // Collect first, then delete, so shifting indexes don't skip elements.
    const targets = this.#heap.filter((v) => predicate(v));
    for (const value of targets) {
      const idx = this.#position.get(value);
      if (idx === undefined) continue;
      removed.push(value);
      const last = this.#heap.pop();
      this.#position.delete(value);
      if (idx < this.#heap.length) {
        this.#heap[idx] = last;
        this.#position.set(last, idx);
        // The moved element could belong higher or lower.
        this.#siftDown(idx);
        this.#siftUp(idx);
      }
    }
    return removed;
  }

  // Rebuild heap order after comparator keys change outside the queue.
  reheapify() {
    for (let i = Math.floor(this.#heap.length / 2) - 1; i >= 0; i -= 1) {
      this.#siftDown(i);
    }
  }

  // Sorted copy; does not touch the heap.
  toArray() {
    return [...this.#heap].sort(this.#comparator);
  }

  *[Symbol.iterator]() {
    yield* this.toArray();
  }

  #swap(i, j) {
    const a = this.#heap[i];
    const b = this.#heap[j];
    this.#heap[i] = b;
    this.#heap[j] = a;
    this.#position.set(b, i);
    this.#position.set(a, j);
  }

  #siftUp(i) {
    let idx = i;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.#comparator(this.#heap[idx], this.#heap[parent]) < 0) {
        this.#swap(idx, parent);
        idx = parent;
      } else {
        break;
      }
    }
  }

  #siftDown(i) {
    let idx = i;
    const n = this.#heap.length;
    for (;;) {
      const left = idx * 2 + 1;
      const right = left + 1;
      let smallest = idx;
      if (left < n && this.#comparator(this.#heap[left], this.#heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this.#comparator(this.#heap[right], this.#heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.#swap(idx, smallest);
      idx = smallest;
    }
  }
}

export default PriorityQueue;
