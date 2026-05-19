/**
 * 事件参数基类
 */
export class EventArgs {
  /** 事件名称 */
  eventName: string;

  /** 事件发生时间 */
  readonly whenOccurred: Date;

  /** 事件参数 */
  args: Record<string, any>;

  /**
   * 创建一个事件参数实例
   * @param eventName 事件名称，默认为空字符串
   */
  constructor(eventName: string = '', args: Record<string, any> = {}) {
    this.eventName = eventName;
    this.args = args;
    this.whenOccurred = new Date();
  }
}

/**
 * 事件订阅句柄，用于标识和管理订阅
 */
export class EventSubscription<T extends EventArgs = EventArgs> {
  private readonly _id: string;
  private _isActive: boolean = true;

  /**
   * @param _id 订阅ID
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @param priority 订阅优先级，数字越大优先级越高
   */
  private readonly _eventName: string;
  private readonly _handler: (args: T) => void;
  private readonly _priority: number;

  constructor(
    eventName: string,
    handler: (args: T) => void,
    priority: number = 0
  ) {
    this._id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this._eventName = eventName;
    this._handler = handler;
    this._priority = priority;
  }

  get id(): string {
    return this._id;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get eventName(): string {
    return this._eventName;
  }

  getHandler(): (args: T) => void {
    return this._handler;
  }

  get priority(): number {
    return this._priority;
  }

  /** 取消订阅 */
  cancel(): void {
    this._isActive = false;
  }
}

import { EventEmitter } from 'events';

/**
 * 事件管理器单例类
 * 继承自Node.js EventEmitter以获得更好的性能和标准API
 */
export class EventManager extends EventEmitter {
  private static _instance: EventManager;
  private _subscriptions: Map<string, EventSubscription<EventArgs>> = new Map();

  /** 获取EventManager单例实例 */
  public static get instance(): EventManager {
    if (!EventManager._instance) {
      EventManager._instance = new EventManager();
    }
    return EventManager._instance;
  }

  constructor() {
    super();
    this.setMaxListeners(100); // 提高默认监听器限制
    this._initializeEventHandlers();
  }

  /**
   * 注册一个事件处理器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @param priority 优先级，数字越大优先级越高
   * @returns 订阅ID
   */
  public subscribe<T extends EventArgs = EventArgs>(
    eventName: string,
    handler: (args: T) => void | boolean | Promise<boolean>,
    priority: number = 0
  ): string {
    const subscription = new EventSubscription<EventArgs>(eventName, handler as any, priority);
    this._subscriptions.set(subscription.id, subscription);
    
    const wrappedHandler = (args: T) => {
      if (subscription.isActive) {
        return handler(args);
      }
    };
    wrappedHandler['priority'] = priority;
    wrappedHandler['subscriptionId'] = subscription.id;
    
    this.on(eventName, wrappedHandler);
    return subscription.id;
  }

  /**
   * 注册一个一次性事件处理器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @returns 订阅ID
   */
  public subscribeOnce<T extends EventArgs = EventArgs>(
    eventName: string,
    handler: (args: T) => void
  ): string {
    const subscription = new EventSubscription<EventArgs>(eventName, handler as any, 0);
    this._subscriptions.set(subscription.id, subscription);
    
    const wrappedHandler = (args: T) => {
      if (subscription.isActive) {
        subscription.cancel();
        this._subscriptions.delete(subscription.id);
        return handler(args);
      }
    };
    wrappedHandler['subscriptionId'] = subscription.id;
    
    this.once(eventName, wrappedHandler);
    return subscription.id;
  }

  /**
   * 取消订阅
   * @param subscriptionId 订阅ID
   * @returns 是否成功取消订阅
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this._subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }
    
    subscription.cancel();
    this._subscriptions.delete(subscriptionId);
    
    // 移除对应的EventEmitter监听器
    const listeners = this.listeners(subscription.eventName);
    for (const listener of listeners) {
      if ((listener as any)['subscriptionId'] === subscriptionId) {
        this.off(subscription.eventName, listener as (...args: any[]) => void);
        break;
      }
    }
    
    return true;
  }

  /**
   * 广播事件
   * @param eventName 事件名称
   * @param args 事件参数
   */
  public async broadcast<T extends EventArgs = EventArgs>(eventName: string, args: T): Promise<boolean> {
    if (!args.eventName) {
      args.eventName = eventName;
    }

    const listeners = this.listeners(eventName);
    if (listeners.length === 0) {
      return true;
    }

    // 按优先级排序
    const sortedListeners = listeners
      .map(handler => ({
        handler,
        priority: (handler as any)['priority'] || 0
      }))
      .sort((a, b) => b.priority - a.priority);
    
    for (const { handler } of sortedListeners) {
      const result = await handler(args);
      if (result === false) {
        return false;
      }
    }
    return true;
  }

  /**
   * 清理所有订阅
   */
  public dispose(): void {
    this._subscriptions.clear();
    this.removeAllListeners();
  }

  /** 初始化事件处理器 */
  private _initializeEventHandlers(): void {
    // 初始化基本事件处理
  }
}