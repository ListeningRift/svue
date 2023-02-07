import { Component, isComponent } from '../runtime/component'
import { invokeArrayFns, isArray, setAttribute } from '../utils'

export const TEXT = Symbol('TEXT')

export type VNodeTypeType = string | typeof TEXT | Component | VNode

export type VNodePropsType = { [key: string]: any }

export type VNodeChildrenType = (VNode | string)[]

export enum TypeFlag {
  ELEMENT = 'ELEMENT',
  COMPONENT = 'COMPONENT'
}

export interface VNode {
  type: VNodeTypeType
  props: VNodePropsType | null
  children: VNodeChildrenType

  __isVNode: boolean,
  __el: HTMLElement | Text
  __component: Component
  __typeFlag: TypeFlag
}

export function createTextVNode(text: any): VNode {
  return {
    type: TEXT,
    props: null,
    children: [String(text)],

    __isVNode: true,
    __typeFlag: TypeFlag.ELEMENT
  } as VNode
}

export function createVNode(type: VNodeTypeType, props: VNodePropsType, children?: any): VNode {
  if (!children) {
    children = [] as VNode[]
  } else {
    if (!isArray(children)) {
      if (isVNode(children)) {
        children = [children]
      } else {
        children = [createTextVNode(children)]
      }
    } else {
      children = children as any[]
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (!isVNode(child)) {
          children[i] = createTextVNode(child)
        }
      }
    }
  }

  let typeFlag: TypeFlag
  if (isComponent(type)) {
    typeFlag = TypeFlag.COMPONENT
  } else {
    typeFlag = TypeFlag.ELEMENT
  }

  return {
    type,
    props,
    children,

    __isVNode: true,
    __typeFlag: typeFlag
  } as VNode
}

export function isVNode(value: any): boolean {
  return value ? value.__isVNode === true : false
}

export function mount(vNode: VNode, target: HTMLElement) {
  if (vNode.__typeFlag === TypeFlag.COMPONENT) {
    mountComponent(vNode, target)
    return
  }
  let rNode: HTMLElement | Text

  if (!vNode.type) {
    return
  }

  if (vNode.type === TEXT) {
    rNode = document.createTextNode(vNode.children[0] as string)
  } else {
    rNode = document.createElement(vNode.type as string)

    if (vNode.props) {
      for (const propName in vNode.props) {
        setAttribute(propName, vNode.props[propName], rNode as HTMLElement)
      }
    }

    (vNode.children as VNode[]).forEach(child => {
      mount(child, rNode as HTMLElement)
    })
  }
  vNode.__el = rNode

  target.appendChild(rNode)
}

export function unmount(vNode: VNode) {
  if (vNode.__typeFlag === TypeFlag.COMPONENT) {
    unmountComponent(vNode)
  } else {
    vNode.__el.parentNode?.removeChild(vNode.__el)
  }
}

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
