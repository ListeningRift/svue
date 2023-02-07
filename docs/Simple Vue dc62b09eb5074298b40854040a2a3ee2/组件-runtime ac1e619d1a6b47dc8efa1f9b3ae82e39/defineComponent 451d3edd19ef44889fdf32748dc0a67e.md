# defineComponent

主要涉及API：`defineComponent`

---

```tsx
export class Component {
  public readonly __isComponent = true
  public __isMounted = false

  public name: string
  public render: RenderFunction = () => ({} as VNode)
  public options: ComponentOptions

  public vNode?: VNode
  public subtree?: VNode
  public props: VNodePropsType = {}
  public slots?: VNodeChildrenType | null

  public 'beforeCreate': HookFunction[] = []
  public 'created': HookFunction[] = []
  public 'beforeMount': HookFunction[] = []
  public 'mounted': HookFunction[] = []
  public 'beforeUpdate': HookFunction[] = []
  public 'updated': HookFunction[] = []
  public 'beforeUnmount': HookFunction[] = []
  public 'unmounted': HookFunction[] = []

  constructor(options: ComponentOptions) {
    this.options = options
    this.name = options.name
  }

  public setComponent(vNode: VNode, props: VNodePropsType | null, slots: VNodeChildrenType | null) {
    this.vNode = vNode
    // props不能直接赋值
    // 因为直接赋值会改变props的引用地址，导致组件内不能同步到props的变化
    const rawProps = toRaw(props)
    for (const key in rawProps) {
      this.props[key] = rawProps[key]
    }
    this.slots = slots
  }

  public setup() {
    setCurrentInstance(this)
    this.render = this.options.setup(this.props)
    unsetCurrentInstance()
  }
}

export function defineComponent(options: ComponentOptions | SetupFunction): Component {
  options = isFunction(options) ? { setup: options, name: options.name } as ComponentOptions : options
  return new Component(options as ComponentOptions)
}
```

我们这里定义一个组件类，这个类会储存组件需要的所有信息。

而按照设计在jsx中使用该组件时，应该是一下这种使用方法：

```jsx
const demo = defineComponent({
  name: 'demo',
  setup(props) {
    const model = ref(true)
    const onButtonClick = () => {
      model.value = !model.value
    }
    return () => (<div>
      {model.value ? dom1 : dom2}
      <button onClick={onButtonClick}>change!</button>
    </div>)
  }
})

const App = defineComponent({
  name: 'demo',
  setup(props) {
    const count = ref(0)
    const onClick = () => {
      count.value++
    }
    return () => (<div>
      { count.value < 3 ? <demo value={count.value}></demo> : <div></div> }
      <div onClick={onClick}>{count.value}</div>
    </div>)
  }
})
```

编译后，组件会作为 `createVNode` 的第一个参数来创建虚拟dom，所以之前我们的虚拟dom部分的方法就需要部分修改。

首先是 `VNode` 的定义

```tsx
export interface VNode {
  type: VNodeTypeType
  props: VNodePropsType | null
  children: VNodeChildrenType

  __isVNode: boolean,
  __el: HTMLElement | Text
  __component: Component
  __typeFlag: TypeFlag
}
```

加一个 `__typeFlag` 属性来区分这个是普通的元素组成的虚拟dom还是组件创建的虚拟dom，因为这两者的 `mount` 方法和 `patch` 方法都有区别。

```tsx
export function mountComponent(vNode: VNode, container: HTMLElement) {
  const instance = vNode.type as Component

  instance.setComponent(vNode, vNode.props, vNode.children)
  instance.setup()
  invokeArrayFns(instance.beforeMount)
  instance.subtree = instance.render()
  vNode.__component = instance
  mount(instance.subtree, container)
  invokeArrayFns(instance.mounted)
  instance.__isMounted = true
  vNode.__el = instance.subtree.__el
}

export function unmountComponent(vNode: VNode) {
  invokeArrayFns(vNode.__component.beforeUnmount)
  unmount(vNode.__component.subtree!)
  invokeArrayFns(vNode.__component.unmounted)
}
```

新增组件的挂载方法和解除挂载方法，组件的挂载方法逻辑为：因为 `setup` 方法按使用要求必须要返回一个函数，这个函数要求又要返回需要的虚拟dom节点，即上面示例中的使用方法，所以我们需要先运行一下 `setup` 方法，将该定义的定义好，该执行的逻辑执行好，这样拿到的 `render` 方法是一个类似于闭包的概念，所有需要的变量全都会被保存在 `render` 方法中不会被销毁，这些变量的改变也可以影响到 `render` 方法返回的虚拟dom结构中（包括作为参数传给 `setup` 方法的 `props`）。然后运行 `render` 方法可以拿到这个组件需要渲染成为的结构，将该虚拟dom结构挂载起来即可。

`patch` 方法调整为：

```tsx
export function patchComponent(oldVDom: VNode, newVDom: VNode) {
  if (shouldComponentUpdate(oldVDom, newVDom)) {
    const component = newVDom.__component = oldVDom.__component
    component.setComponent(newVDom, newVDom.props, newVDom.children)
  } else {
    newVDom.__el = oldVDom.__el
    newVDom.__component = oldVDom.__component
    newVDom.__component.vNode = newVDom
  }
}

export function patch(oldVDom: VNode | null, newVDom: VNode, el: HTMLElement) {
  if (oldVDom === newVDom) {
    return
  }

  if (oldVDom && oldVDom.type !== newVDom.type) {
    unmount(oldVDom)
    oldVDom = null
  }

  if (!oldVDom) {
    mount(newVDom, el)
    return
  }

  if (newVDom.__typeFlag === TypeFlag.COMPONENT) {
    const instance = newVDom.__component = oldVDom.__component
    if (instance.__isMounted) {
      invokeArrayFns(instance.beforeUpdate)
      patchComponent(oldVDom!, newVDom)
      const newTree = instance.render()
      const oldTree = instance.subtree
      patch(oldTree!, newTree, el)
      invokeArrayFns(instance.updated)
    } else {
      invokeArrayFns(instance.beforeMount)
      patch(null, instance.subtree!, el)
      invokeArrayFns(instance.mounted)
      instance.__isMounted = true
    }
  } else {
    newVDom.__el = oldVDom!.__el
    patchProps(oldVDom!, newVDom)
    patchChildren(oldVDom!, newVDom, el)
  }
}
```

如果需要对比的是组件创建的虚拟dom，那就将需要更新的数据更新进去即可，由于 `props` 传入的是一个对象，直接修改该对象的值就可以同步到组件内部，而不用重新在运行一遍 `setup` 。