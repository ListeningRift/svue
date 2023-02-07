import { isFunction, NOOP } from '../utils'
import { Dep, createDep, ReactiveEffect } from './effect'
import { toRaw } from './reactive'
import { traceRef, triggerRef } from './ref'

export type ComputedGetter<T> = (...args: any[]) => T
export type ComputedSetter<T> = (v: T) => void
export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export class Computed<T = any> {
  private __value!: T
  public readonly __isRef = true

  public dep: Dep = createDep()
  private setter: ComputedSetter<T>
  private effect: ReactiveEffect<T>

  private __isChange = true // 用于标记依赖的值是否已经发生改变，如果没有改变则不需要重新运行getter收集依赖

  constructor(getter: ComputedGetter<T>, setter: ComputedSetter<T>) {
    this.setter = setter
    this.effect = new ReactiveEffect(getter, () => {
      if (!this.__isChange) {
        this.__isChange = true
        triggerRef(this)
      }
    })
  }

  get value() {
    traceRef(toRaw(this))
    if (this.__isChange) {
      this.__isChange = false
      this.__value = this.effect.runEffect()
    }
    return this.__value
  }

  set value(newValue: T) {
    this.setter(newValue)
  }
}

export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions as ComputedGetter<T>
    setter = NOOP
  } else {
    getterOrOptions = getterOrOptions as WritableComputedOptions<T>
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new Computed(getter, setter)
}