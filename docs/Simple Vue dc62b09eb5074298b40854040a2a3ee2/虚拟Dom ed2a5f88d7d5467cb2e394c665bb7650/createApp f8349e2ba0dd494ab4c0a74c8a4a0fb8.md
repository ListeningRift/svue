# createApp

主要API：`createApp`

---

```tsx
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
```

借助 `watchEffect` 来实现依赖改变时自动更新视图