import _ from 'lodash'
import { isObject } from '../utils'
import { baseHandlers } from './handlers'

interface Target {
  __isReactive?: boolean
  __raw?: any
}

const existingProxyMap = new WeakMap<any, any>()

export function reactive(target: object) {
  if (!isObject(target)) {
    return target
  }

  if (isReactive(target)) {
    return target
  }

  const existingProxy = existingProxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const raw = _.cloneDeep(target) as Target
  raw.__raw = _.cloneDeep(target)
  raw.__isReactive = true

  const proxy = new Proxy(raw, baseHandlers)

  existingProxyMap.set(target, proxy)
  return proxy
}

export function isReactive(value: any): boolean {
  return value && value.__isReactive
}

export function toReactive<T>(value: T): T {
  return isObject(value) ? reactive(value as object) : value
}

export function toRaw<T>(value: T): T {
  const raw = value && (value as any).__raw
  return raw ? raw : value
}
