import { Ref, isRef } from './ref'
import { isReactive } from './reactive'
import { isArray, isFunction, isIntegerKey, NOOP } from '../utils'
import { Computed } from './computed'

export let activeEffect: ReactiveEffect | null

export let effectTraceDepth = 0 // 当前嵌套深度

export class ReactiveEffect<T = any> {
  effect: () => T
  watchCallback: (() => any) | undefined = undefined

  parent: ReactiveEffect | null = null
  includedDeps: Dep[] = []

  constructor(effect: () => T, watchCallback?: (() => any) | undefined) {
    this.effect = effect
    this.watchCallback = watchCallback
  }

  runEffect(): T {
    effectTraceDepth++
    this.parent = activeEffect
    activeEffect = this

    const res = this.effect()

    this.cleanupDeps()
    this.includedDeps.forEach(dep => {
      dep.newTrace[effectTraceDepth] = false
    })
    effectTraceDepth--
    activeEffect = this.parent
    this.parent = null
    return res
  }

  cleanupDeps() {
    const deleteIndexArr: number[] = []
    this.includedDeps.forEach((dep, index) => {
      if (!dep.newTrace[effectTraceDepth]) {
        dep.delete(this)
        deleteIndexArr.push(index)
      }
    })
    this.includedDeps.filter((dep, index) => {
      return deleteIndexArr.indexOf(index) === -1
    })
  }
}

interface TraceMarker {
  newTrace: boolean[]
}

export type Dep = Set<ReactiveEffect> & TraceMarker
export type DepsMap = Map<any, Dep>

export function createDep(): Dep {
  const dep = new Set<ReactiveEffect>() as Dep
  dep.newTrace = [false]
  return dep
}

export const ITERATEKEY = Symbol('iterate')

const targetMap = new WeakMap<object, DepsMap>()

function getDepByTarget(target: object, p: string | symbol) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map<object, Dep>()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(p)
  if (!dep) {
    dep = createDep()
    depsMap.set(p, dep)
  }
  return {
    dep,
    depsMap
  }
}

export enum TriggerType {
  ADD = 'ADD',
  SET = 'SET',
  DELETE = 'delete'
}

export function triggerReactive(target: object, p: string | symbol, triggerType: TriggerType) {
  const { dep, depsMap } = getDepByTarget(target, p)
  const deps: (Dep | undefined)[] = [dep]

  if (triggerType === TriggerType.ADD) {
    if (!isArray(target)) {
      deps.push(depsMap.get(ITERATEKEY))
    } else if (isIntegerKey(p)) {
      deps.push(depsMap.get('length'))
    }
  } else if (triggerType === TriggerType.DELETE) {
    if (!isArray(target)) {
      deps.push(depsMap.get(ITERATEKEY))
    }
  }

  const effects: ReactiveEffect[] = []
  deps.forEach(dep => {
    dep && effects.push(...dep)
  })

  effects.forEach((effect) => {
    if (effect !== activeEffect) { // 当副作用方法里会触发set时防止递归调用
      if (effect.watchCallback) {
        effect.watchCallback()
      } else {
        effect.runEffect()
      }
    }
  })
}

export function traceReactive(target: object, p: string | symbol) {
  if (activeEffect) {
    const { dep } = getDepByTarget(target, p)
    dep.newTrace[effectTraceDepth] = true

    if(!dep.has(activeEffect)) {
      activeEffect.includedDeps.push(dep)
      dep.add(activeEffect)
    }
  }
}


export function watchEffect(effect: () => void) {
  const prevActiveEffect = activeEffect
  activeEffect = new ReactiveEffect(effect)
  activeEffect.runEffect()
  activeEffect = prevActiveEffect
}


export type WatchSource<T = any> = Ref<T> | Computed<T> | (() => T)
export type WatchCallback = (newValue: any, oldValue: any) => any

export function watch(watchTarget: WatchSource<unknown> | object | (WatchSource<unknown> | object)[], watchCallback: WatchCallback) {
  let getter: () => any
  let oldValue: any

  if (isRef(watchTarget)) {
    getter = () => (watchTarget as Ref).value
  } else if (isReactive(watchTarget)) {
    getter = () => watchTarget
  } else if (isFunction(watchTarget)) {
    getter = () => (watchTarget as () => any)()
  } else if (isArray(watchTarget)) {
    getter = () =>
      watchTarget.map(target => {
        if (isRef(target)) {
          return target.value
        } else if (isReactive(target)) {
          return target
        } else if (isFunction(target)) {
          return (target as () => any)()
        }
      })
  } else {
    getter = NOOP
  }

  const callback = () => {
    const newValue = effect.runEffect()
    watchCallback(newValue, oldValue)
  }

  const prevActiveEffect = activeEffect
  const effect = new ReactiveEffect(getter, callback)
  activeEffect = effect
  oldValue = effect.runEffect()
  activeEffect = prevActiveEffect
}
