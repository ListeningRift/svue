import { hasChanged } from '../utils'
import { Computed } from './computed'
import { Dep, createDep, effectTraceDepth, activeEffect } from './effect'
import { toReactive, toRaw } from './reactive'

export function triggerRef(ref: Ref | Computed) {
  const dep = ref.dep

  dep.forEach((effect) => {
    if (effect !== activeEffect) { // 当副作用方法里会触发set时防止递归调用
      if (effect.watchCallback) {
        effect.watchCallback()
      } else {
        effect.runEffect()
      }
    }
  })
}

export function traceRef(ref: Ref | Computed) {
  if (activeEffect) {
    const dep = ref.dep
    dep.newTrace[effectTraceDepth] = true

    if(!dep.has(activeEffect)) {
      activeEffect.includedDeps.push(dep)
      dep.add(activeEffect)
    }
  }
}

export class Ref<T = any> {
  private __raw: T
  private __value: T

  public readonly __isRef = true
  public dep: Dep = createDep() // 需要一个储存.value整体的副作用的dep

  constructor(target: T) {
    this.__raw = toRaw(target)
    this.__value = toReactive(target)
  }

  set value(newValue: any) {
    newValue = toRaw(newValue)
    if (hasChanged(newValue, this.__raw)) {
      this.__raw = newValue
      this.__value = toReactive(newValue)
      triggerRef(this)
    }
  }

  get value() {
    traceRef(this)
    return this.__value
  }
}

export function ref<T>(target: T) {
  if (isRef(target)) {
    return target
  }

  return new Ref(target)
}

export function isRef(target: any): boolean {
  return target && target.__isRef
}
