# createVNode

主要涉及API：`createVNode`

---

用于创建一个虚拟Dom对象

首先我们需要建立一个虚拟Dom类型，这个类型主要会存储建立真实Dom所需要的所有信息

```tsx
// 用于标志纯文字节点的元素类型
// 仅在代码里使用不会反映在真实Dom上，所以可以设置一个Symbol值
export const TEXT = Symbol('TEXT')

export type TypeType = string | typeof TEXT

export type PropsType = { [key: string]: any }

// 纯文字节点时children中会储存文字内容
export type ChildrenType = (VNode | string)[]

export interface VNode {
  type: TypeType // 存储元素类型，如div或p等，需要考虑纯文字节点的情况
  props: PropsType | null // 存储元素属性信息
  children: ChildrenType // 存储子节点信息，将该字段统一为数组简化之后对类型的处理

  __isVNode: boolean, // 用于判断类型是否是一个虚拟Dom对象
  __el: HTMLElement | Text // 用于存储虚拟Dom对应的真实Dom，只在渲染后有值
}
```

接下来我们提供一个API帮助建立虚拟Dom，处理参数类型减少后面类型判断的工作量。

```tsx
// 用于创建一个纯文字节点虚拟Dom
export function createTextVNode(text: any): VNode {
  return {
    type: TEXT,
    props: null,
    children: [String(text)],

    __isVNode: true
  } as VNode
}

// 用于创建虚拟Dom对象
export function createVNode(type: TypeType, props: PropsType, children?: any): VNode {
  if (!children) {
    children = [] as VNode[]
  } else {
    if (!isArray(children)) {
      if (isVnode(children)) {
        children = [children]
      } else {
        children = [createTextVNode(children)]
      }
    } else {
      children = children as any[]
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (!isVnode(child)) {
          children[i] = createTextVNode(child)
        }
      }
    }
  }

  return {
    type,
    props,
    children,

    __isVNode: true
  } as VNode
}
```