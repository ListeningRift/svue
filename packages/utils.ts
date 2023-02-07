// 常量
export const NOOP = () => {}

//类型判断
export const isArray = Array.isArray
export function isString(value: unknown): boolean {
  return typeof value === 'string'
}
export function isIntegerKey(value: unknown): boolean {
  return isString(value) &&
    '' + parseInt(value as string, 10) === value &&
    value !== 'NaN' &&
    parseInt(value, 10) >= 0
}
export function isObject(value: any): boolean {
  return value && typeof value === 'object'
}
export function isFunction(value: any): boolean {
  return typeof value === 'function'
}

// 工具方法
export function setAttribute(propName: string, value: any, el: HTMLElement) {
  if (propName.startsWith('on')) {
    el.addEventListener(propName.slice(2).toLocaleLowerCase(), value)
  } else {
    el.setAttribute(propName, value)
  }
}
export function removeAttribute(propName: string, value: any, el: HTMLElement) {
  if (propName.startsWith('on')) {
    el.removeEventListener(propName.slice(2).toLocaleLowerCase(), value)
  } else {
    el.removeAttribute(propName)
  }
}
export function hasChanged(value: any, oldValue: any): boolean {
  return !Object.is(value, oldValue)
}
export function hasOwn(target: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(target, key)
}
export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}
