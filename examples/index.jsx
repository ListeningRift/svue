import {
  createApp,
  createVNode,
  defineComponent,
  ref,
  watch,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted
} from '../dist/lib/svue.esm.js'

const dom1 = (<div class="test-dom-1">
  <p>test dom 1</p>
  test test
</div>)
const dom2 = (<div class="test-dom-2">
  <p>test dom 2</p>
</div>)

const demo = defineComponent({
  name: 'demo',
  setup(props) {
    const model = ref(true)
    const onButtonClick = () => {
      model.value = !model.value
    }
    watch(model, () => {
      console.log('change:', props.value)
    })
    onBeforeMount(() => {
      console.log('before mount')
    })
    onMounted(() => {
      console.log('mounted')
    })
    onBeforeUpdate(() => {
      console.log('before update')
    })
    onUpdated(() => {
      console.log('updated')
    })
    onBeforeUnmount(() => {
      console.log('before unmount')
    })
    onUnmounted(() => {
      console.log('unmounted')
    })
    return () => (<div>
      {props.value}
      {model.value ? dom1 : dom2}
      <button onClick={onButtonClick}>change!</button>
    </div>)
  }
})

const App = defineComponent({
  name: 'demo',
  setup(props) {
    const count = ref(0)
    const onClick = () => {
      count.value++
    }
    return () => (<div>
      { count.value < 3 ? <demo value={count.value}></demo> : <div></div> }
      <div onClick={onClick}>{count.value}</div>
    </div>)
  }
})

createApp(App).mount(document.querySelector('#app'))
