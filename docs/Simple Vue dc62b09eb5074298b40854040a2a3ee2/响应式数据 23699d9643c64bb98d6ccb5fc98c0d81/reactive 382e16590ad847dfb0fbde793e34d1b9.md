# reactive

主要API：`reactive` ，`isReactive` ， `toReactive` ， `toRaw`

---

用于建立对象数组的响应式数据（暂不支持Set，Map）

在介绍reactive直接，需要介绍Vue3的响应式原理。

Vue3最核心的响应式机制其实只有两点：**1. 数据改变通知 2. 收到通知触发所有副作用方法**

为了实现第一点，Vue2使用的方式是通过`Object.defineProperty` 给字段定义 `set` 和 `get` 方法，这样就可以拦截到数据的改变，但是这种方案的问题在于不能给没有定义的字段添加响应，无法监听数组的改变，`delete` ，`in` 等关键字无法收集依赖也无法触发改变，所以Vue2才提供了 `this.$set` 这种方法来强制给无法监听到的数据添加响应。

到了Vue3，这个机制被改为通过ES6的新特性 `Proxy` 来实现，其实大致使用方法是一致的，但是 `Proxy` 提供了更多的事件handler来监听不同的取值赋值方式（具体handler注解见下方[注解1](reactive%20382e16590ad847dfb0fbde793e34d1b9.md)），也能够对数据等类型做监听。

接下来是第二点，其实我们只要知道我们需要触发那些副作用，把它们收集起来和响应式变量一一对应，响应式变量改变时我们只需要逐个执行这些副作用即可。

```tsx
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

  const raw = cloneObject(target) as Target
  raw.__raw = cloneObject(target)
  raw.__isReactive = true

  const proxy = new Proxy(raw, baseHandlers)

  existingProxyMap.set(target, proxy)
  return proxy
}
```

上面是 `reactive` 方法的代码，首先要注意的是， `reactive` 过滤掉了不是 `object` 类型的数据，他并没有办法对基础数据类型做处理，基础数据类型也并不需要 `Proxy` 来做响应式处理，只需要最基本的 `set` 和 `get` 方法即可，这部分相对 `reactive` 要简单些，且会依赖于 `reactive` ，具体的会在[ref](ref%20c982c2ce219d4a12bcdac843f4312da0.md) 中介绍。如果传值是已经建立过响应式数据的，那么则会直接返回之前的代理。

下方有一个 `baseHandlers` 这个对象储存的是所有需要用到的 `ProxyHandler` 。

```tsx
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
```

每个方法其实只是在对应的原功能的基础上做了 `trigger` 和 `trace` 。

```tsx
export let activeEffect: ReactiveEffect | null

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
```

`trace` 的意义是收集该依赖，在副作用中每次取到这个值，我就需要知道当这个值改变时需要执行副作用了。执行 `trace` 我需要将这个值和当前这个副作用建立一个联系，一个值可能会对应多个副作用，所以首先我先需要一个集合来存储所有副作用，这个集合类我们将其命名为 `Dep`（`ReactiveEffect` 会在[watchEffect](watchEffect%200808d9e9fe3245b685b0721851589882.md) 中介绍副作用的时候详细介绍，当前值需要将其理解为一个副作用即可）。为了保证粒度够小够精确，我们需要建立的与 `Dep` 对应的值应该要精确到字段，这个映射关系就是 `DepsMap` 。所以现在我们要取到一个值其对应 `Dep` 整体流程就是先通过原始数据从 `targetMap` 中取到字段与 `Dep` 的映射，再通过需要取的字段从这个映射中最终取到副作用集合 `Dep` 。当使用者定义副作用时（例如通过 `watchEffect`）只需要将副作用赋值给全局变量 `activeEffect` ，执行一遍当前副作用， `trace` 就会拿到副作用并把它添加进当前取值字段对应的 `Dep` 中。

`trigger` 要做的就是以相同的步骤拿到 `Dep` 之后逐个执行一遍。但是这里有一个问题，执行副作用时，我们在副作用方法中可能还会触发依赖的 `trigger` ，这个副作用就会被不断递归触发，我们就需要限制当需要执行的副作用和当前在执行的副作用一致时就不执行。这里执行副作用时经过了一个判断，判断有没有 `watchCallback` ，为什么有这个判断会放在 [watch](watch%207d30669e87574d518d7b1f5d42c1dc46.md) 中详细讲解。

剩下的还会定义一些工具方法，包括获取响应式数据对应的原始数据的 `toRaw` ，判断对象是不是 `reactive` 类型的 `isReactive` ，将数据转换为 `reactive` 类型的 `toReactive` 。

```tsx
export function isReactive(value: any): boolean {
  return value && value.__isReactive
}

export function toReactive<T>(value: T): T {
  return isObject(value) ? reactive(value as object) : value
}

export function toRaw<T>(value: T): T {
  const raw = value && (value as any)['__raw']
  return raw ? raw : value
}
```

注解：

1. `Proxy` 特性提供的handler

```tsx
interface ProxyHandler<T extends object> {
    /**
     * A trap method for a function call.
     * @param target The original callable object which is being proxied.
     */
    apply?(target: T, thisArg: any, argArray: any[]): any;

    /**
     * A trap for the `new` operator.
     * @param target The original object which is being proxied.
     * @param newTarget The constructor that was originally called.
     */
    construct?(target: T, argArray: any[], newTarget: Function): object;

    /**
     * A trap for `Object.defineProperty()`.
     * @param target The original object which is being proxied.
     * @returns A `Boolean` indicating whether or not the property has been defined.
     */
    defineProperty?(target: T, property: string | symbol, attributes: PropertyDescriptor): boolean;

    /**
     * A trap for the `delete` operator.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to delete.
     * @returns A `Boolean` indicating whether or not the property was deleted.
     */
    deleteProperty?(target: T, p: string | symbol): boolean;

    /**
     * A trap for getting a property value.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to get.
     * @param receiver The proxy or an object that inherits from the proxy.
     */
    get?(target: T, p: string | symbol, receiver: any): any;

    /**
     * A trap for `Object.getOwnPropertyDescriptor()`.
     * @param target The original object which is being proxied.
     * @param p The name of the property whose description should be retrieved.
     */
    getOwnPropertyDescriptor?(target: T, p: string | symbol): PropertyDescriptor | undefined;

    /**
     * A trap for the `[[GetPrototypeOf]]` internal method.
     * @param target The original object which is being proxied.
     */
    getPrototypeOf?(target: T): object | null;

    /**
     * A trap for the `in` operator.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to check for existence.
     */
    has?(target: T, p: string | symbol): boolean;

    /**
     * A trap for `Object.isExtensible()`.
     * @param target The original object which is being proxied.
     */
    isExtensible?(target: T): boolean;

    /**
     * A trap for `Reflect.ownKeys()`.
     * @param target The original object which is being proxied.
     */
    ownKeys?(target: T): ArrayLike<string | symbol>;

    /**
     * A trap for `Object.preventExtensions()`.
     * @param target The original object which is being proxied.
     */
    preventExtensions?(target: T): boolean;

    /**
     * A trap for setting a property value.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to set.
     * @param receiver The object to which the assignment was originally directed.
     * @returns A `Boolean` indicating whether or not the property was set.
     */
    set?(target: T, p: string | symbol, newValue: any, receiver: any): boolean;

    /**
     * A trap for `Object.setPrototypeOf()`.
     * @param target The original object which is being proxied.
     * @param newPrototype The object's new prototype or `null`.
     */
    setPrototypeOf?(target: T, v: object | null): boolean;
}
```