# jsx编译插件

---

基于 `babel` 实现一个jsx的编译插件，编译成为自己想要的结果，基于 `@babel/plugin-syntax-jsx` ：这个插件会将jsx语法的ast包装成为各种jsx元素，同时提供了判断jsx元素的方法，继承这个插件就可以很简单的编写出自己的babel jsx编译插件。

```jsx
const syntaxJsx = require('@babel/plugin-syntax-jsx').default

function transformJSXElement(t, path) {
  const tag = getType(t, path.get('openingElement'))
  const children = getChildren(t, path.get('children'))
  const props = getProps(t, path.get('openingElement'))
  return t.callExpression(t.identifier('createVNode'), [tag, props, children])
}

module.exports = function(babel) {
  const t = babel.types

  return {
    name: 'babel-plugin-transform-svue-jsx',
    inherits: syntaxJsx,
    visitor: {
      JSXElement(path) {
        path.replaceWith(transformJSXElement(t, path))
      }
    }
  }
}
```

大致逻辑就是获取元素的 `tag`，`props`，`children` 然后使用 `t.callExpression` 方法拼在 `createVNode` 方法的三个参数中。

```tsx
// 获取type
function getType(t, path) {
  const namePath = path.get('name')
  const name = namePath.get('name').node
  if (path.scope.hasBinding(name) && !htmlTags.includes(name) && !svgTags.includes(name)) {
    return t.identifier(name)
  } else {
    return t.stringLiteral(name)
  }
}

// 获取children
function getChildren(t, paths) {
  return t.arrayExpression(paths.map((path, index) => {
    if (path.isJSXText()) {
      return transformJSXText(t, path)
    }
    if (path.isJSXExpressionContainer()) {
      return transformJSXExpressionContainer(t, path)
    }
    if (path.isJSXSpreadChild()) {
      return transformJSXSpreadChild(t, path)
    }
    if (path.isJSXElement()) {
      return transformJSXElement(t, path)
    }
  })
  .filter(el => {
    return el !== null && !t.isJSXEmptyExpression(el)
  }))
}

// 为了编译出的文字节点更有可读性将特殊符号去掉
function transformJSXText(t, path) {
  const node = path.node
  const lines = node.value.split(/\r\n|\n|\r/)

  let lastNonEmptyLine = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i
    }
  }

  let str = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const isFirstLine = i === 0
    const isLastLine = i === lines.length - 1
    const isLastNonEmptyLine = i === lastNonEmptyLine

    let trimmedLine = line.replace(/\t/g, ' ')

    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, '')
    }

    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, '')
    }

    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += ' '
      }

      str += trimmedLine
    }
  }

  return str !== '' ? t.stringLiteral(str) : null
}

function transformJSXExpressionContainer(t, path) {
  return path.get('expression').node
}

function transformJSXSpreadChild(t, path) {
  return t.spreadElement(path.get('expression').node)
}

function getProps(t, path) {
  const props = []

  const attributesPaths = path.get('attributes')
  attributesPaths.forEach(path => {
    if (t.isJSXAttribute(path)) {
      let name, value
      const namePath = path.get('name'), valuePath = path.get('value')

      if (t.isJSXNamespacedName(namePath)) {
        name = `${namePath.get('namespace.name').node}:${namePath.get('name.name').node}`
      } else {
        name = namePath.get('name').node
      }

      if (!valuePath.node) {
        value = t.booleanLiteral(true)
      } else if (t.isJSXExpressionContainer(valuePath)) {
        value = valuePath.node.expression
      } else if (t.isStringLiteral(valuePath)) {
        value = valuePath.node
      }

      props.push([name, value])
    } else if (t.isJSXSpreadAttribute(path)) {
      const argument = path.get('argument')
      props.push(['svue-spread', argument.node])
    }
  });

  return props.length ? transformProps(t, props) : t.nullLiteral()
}

function transformProps(t, props) {
  return t.objectExpression(
    props.map(([key, value]) => {
      if (key === 'svue-spread') {
        return t.spreadElement(value)
      } else {
        return t.objectProperty(t.stringLiteral(key), value)
      }
    })
  )
}
```