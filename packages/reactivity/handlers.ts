import { isArray, isObject, isIntegerKey, hasOwn } from '../utils'
import { traceReactive, triggerReactive, ITERATEKEY, TriggerType } from './effect'
import { reactive } from './reactive'

function get(target: object, p: string | symbol, receiver: any): any {
  traceReactive(target, p)
  const res = Reflect.get(target, p, receiver)
  if (isObject(res)) {
    return reactive(res)
  }
  return res
}

function set(target: object, p: string | symbol, newValue: any, receiver: any): boolean {
  const result = Reflect.set(target, p, newValue, receiver)

  const hadKey =
    isArray(target) && isIntegerKey(p)
      ? Number(p) < target.length
      : hasOwn(target, p)
  if (!hadKey) {
    triggerReactive(target, p, TriggerType.ADD)
  } else {
    triggerReactive(target, p, TriggerType.SET)
  }
  return result
}

function has(target: object, p: string | symbol): boolean {
  const result = Reflect.has(target, p)
  traceReactive(target, p)
  return result
}

function ownKeys(target: object): ArrayLike<string | symbol> {
  // 使用Object.keys的时候并不会传入key，但是需要一个指定key值来存储对应操作的dep
  traceReactive(target, isArray(target) ? 'length' : ITERATEKEY)
  return Reflect.ownKeys(target)
}

function deleteProperty(target: object, p: string | symbol): boolean {
  const hadKey = hasOwn(target, p)
  const result = Reflect.deleteProperty(target, p)
  if (result && hadKey) {
    triggerReactive(target, p, TriggerType.DELETE)
  }
  return result
}

export const baseHandlers: ProxyHandler<object> = {
  get,
  set,
  has,
  ownKeys,
  deleteProperty
}
