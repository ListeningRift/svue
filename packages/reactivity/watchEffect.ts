export let activeEffect: (() => void) | null

export function watchEffect(effect: () => void) {
  activeEffect = effect
  effect()
  activeEffect = null
}