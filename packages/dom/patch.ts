import { VNodePropsType, TEXT, VNode, mount, unmount, TypeFlag } from './vNode'
import { removeAttribute, setAttribute, invokeArrayFns } from '../utils'
import _ from 'lodash'

export function patchProps(oldVDom: VNode, newVDom: VNode) {
  const oldProps = oldVDom.props
  const newProps = newVDom.props
  const el = oldVDom.__el as HTMLElement

  if (!oldProps && !newProps) {
    return
  } else if (!oldProps && newProps) {
    for (const propName in newProps) {
      setAttribute(propName, newProps[propName], el)
    }
  } else if (oldProps && !newProps) {
    for (const propName in oldProps) {
      removeAttribute(propName, oldProps[propName], el)
    }
  } else {
    const removeProps = _.cloneDeep(oldProps as VNodePropsType)
    const setProps = _.cloneDeep(newProps as VNodePropsType)

    for (const propName in setProps) {
      if (removeProps[propName] !== undefined) {
        if (String(removeProps[propName]) !== String(setProps[propName])) {
          setAttribute(propName, setProps[propName], el)
        }
        delete removeProps[propName]
      } else {
        setAttribute(propName, setProps[propName], el)
      }
    }

    for (const propName in removeProps) {
      removeAttribute(propName, removeProps[propName], el)
    }
  }
}

export function patchChildren(oldVDom: VNode, newVDom: VNode, el: HTMLElement) {
  const oldChildren = oldVDom.children
  const newChildren = newVDom.children

  if (newVDom.type === TEXT) {
    oldVDom.__el.textContent = newChildren[0] as string
  } else {
    if (oldVDom.type === TEXT) {
      oldVDom.__el.textContent = ''
      newChildren.forEach(child => {
        mount(child as VNode, oldVDom.__el as HTMLElement)
      })
    } else {
      const commonLength = Math.min(oldChildren.length, newChildren.length)
      for (let i = 0; i < commonLength; i++) {
        patch(oldChildren[i] as VNode, newChildren[i] as VNode, el)
      }

      if (oldChildren.length < newChildren.length) {
        const restChildren = newChildren.slice(commonLength)
        restChildren.forEach(child => {
          mount(child as VNode, oldVDom.__el as HTMLElement)
        })
      } else if (oldChildren.length > newChildren.length) {
        const restChildren = oldChildren.slice(commonLength)
        restChildren.forEach(child => {
          unmount(child as VNode)
        })
      }
    }
  }
}

export function shouldComponentUpdate(oldVDom: VNode, newVDom: VNode): boolean {
  const oldProps = oldVDom.props
  const newProps = newVDom.props

  if (oldProps === newProps) {
    return false
  }
  if (!oldProps) {
    return !!newProps
  }
  if (!newProps) {
    return true
  }

  const newPropsKeys = Object.keys(newProps)
  if (Object.keys(oldProps).length !== newPropsKeys.length) {
    return true
  }

  for (let i = 0; i < newPropsKeys.length; i++) {
    if (oldProps[newPropsKeys[i]] !== newProps[newPropsKeys[i]]) {
      return true
    }
  }

  return false
}

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
