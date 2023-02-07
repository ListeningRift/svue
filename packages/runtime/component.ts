import { VNodePropsType, VNodeChildrenType, VNode } from '../dom/vNode'
import { toRaw } from '../reactivity'
import { isFunction } from '../utils'

export type RenderFunction = () => VNode
export type SetupFunction = (props?: VNodePropsType | null, slots?: VNodeChildrenType | null) => RenderFunction

export interface ComponentOptions {
  name: string
  setup: SetupFunction
}

export type HookFunction = () => any

export class Component {
  public readonly __isComponent = true
  public __isMounted = false

  public name: string
  public render: RenderFunction = () => ({} as VNode)
  public options: ComponentOptions

  public vNode?: VNode
  public subtree?: VNode
  public props: VNodePropsType = {}
  public slots: VNodeChildrenType = []

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
    if (slots) {
      slots.forEach((slot, index) => {
        this.slots[index] = slot
      })
    }
  }

  public setup() {
    setCurrentInstance(this)
    this.render = this.options.setup(this.props, this.slots)
    unsetCurrentInstance()
  }
}

export function defineComponent(options: ComponentOptions | SetupFunction): Component {
  options = isFunction(options) ? { setup: options, name: options.name } as ComponentOptions : options
  return new Component(options as ComponentOptions)
}

export function isComponent(value: any): boolean {
  return value && value.__isComponent
}

export let currentInstance: Component | null = null

export const getCurrentInstance: () => Component | null = () => currentInstance

export const setCurrentInstance = (instance: Component) => {
  currentInstance = instance
}

export const unsetCurrentInstance = () => {
  currentInstance = null
}
