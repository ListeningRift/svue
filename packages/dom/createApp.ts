import { Component } from '../runtime'
import { watchEffect } from '../reactivity'
import { patch } from './patch'
import { createVNode } from './vNode'


export function createApp(rootComponent: Component, rootProps: any = null) {
  const app = {
    mount(rootContainer: HTMLElement) {
      watchEffect(() => {
        const newVDom = createVNode(
          rootComponent as Component,
          rootProps
        )
        patch((rootContainer as any).__vNode || null, newVDom, rootContainer)
        ;(rootContainer as any).__vNode = newVDom
      })
    }
  }
  return app
}