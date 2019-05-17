import Vue from 'vue'
import App from './App.vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/monokai.css'

/**
 * 注册一个指令，v-hljs，代码高亮
 */
Vue.directive('hljs',function (el) {
  let blocks = el.querySelectorAll('pre code');
  blocks.forEach((block)=>{
    hljs.highlightBlock(block)
  })
})

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
