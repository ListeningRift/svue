import { currentInstance, HookFunction } from './component'

const enum LifecycleHooks {
  beforeMount = 'beforeMount',
  mounted = 'mounted',
  beforeUpdate = 'beforeUpdate',
  updated = 'updated',
  beforeUnmount = 'beforeUnmount',
  unmounted = 'unmounted'
}

function createHook(lifecycle: LifecycleHooks) {
  return (hookFunction: HookFunction) => {
    if (currentInstance) {
      currentInstance[lifecycle].push(hookFunction)
    }
  }
}

export const onBeforeMount = createHook(LifecycleHooks.beforeMount)
export const onMounted = createHook(LifecycleHooks.mounted)
export const onBeforeUpdate = createHook(LifecycleHooks.beforeUpdate)
export const onUpdated = createHook(LifecycleHooks.updated)
export const onBeforeUnmount = createHook(LifecycleHooks.beforeUnmount)
export const onUnmounted = createHook(LifecycleHooks.unmounted)
