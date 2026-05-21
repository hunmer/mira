type Listener = (...args: any[]) => void;

export class EventEmitter {
  private _events: Map<string, Listener[]> = new Map();

  on(event: string, listener: Listener): this {
    const listeners = this._events.get(event) || [];
    listeners.push(listener);
    this._events.set(event, listeners);
    return this;
  }

  off(event: string, listener: Listener): this {
    const listeners = this._events.get(event);
    if (listeners) {
      this._events.set(event, listeners.filter(l => l !== listener));
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this._events.get(event);
    if (!listeners || listeners.length === 0) return false;
    listeners.forEach(l => l(...args));
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
    return this;
  }
}
