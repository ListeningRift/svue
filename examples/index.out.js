import { createApp, createVNode, defineComponent, ref, watch, onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from '../dist/lib/svue.esm.js';
const dom1 = createVNode("div", {
  "class": "test-dom-1"
}, [createVNode("p", null, ["test dom 1"]), "test test"]);
const dom2 = createVNode("div", {
  "class": "test-dom-2"
}, [createVNode("p", null, ["test dom 2"])]);
const demo = defineComponent({
  name: 'demo',
  setup(props) {
    const model = ref(true);
    const onButtonClick = () => {
      model.value = !model.value;
    };
    watch(model, () => {
      console.log('change:', props.value);
    });
    onBeforeMount(() => {
      console.log('before mount');
    });
    onMounted(() => {
      console.log('mounted');
    });
    onBeforeUpdate(() => {
      console.log('before update');
    });
    onUpdated(() => {
      console.log('updated');
    });
    onBeforeUnmount(() => {
      console.log('before unmount');
    });
    onUnmounted(() => {
      console.log('unmounted');
    });
    return () => createVNode("div", null, [props.value, model.value ? dom1 : dom2, createVNode("button", {
      "onClick": onButtonClick
    }, ["change!"])]);
  }
});
const App = defineComponent({
  name: 'demo',
  setup(props) {
    const count = ref(0);
    const onClick = () => {
      count.value++;
    };
    return () => createVNode("div", null, [count.value < 3 ? createVNode(demo, {
      "value": count.value
    }, []) : createVNode("div", null, []), createVNode("div", {
      "onClick": onClick
    }, [count.value])]);
  }
});
createApp(App).mount(document.querySelector('#app'));
