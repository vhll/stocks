import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

//Bootstrap
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
// Import Bootstrap an BootstrapVue CSS files (order is important)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
// Make BootstrapVue available throughout your project
Vue.use(BootstrapVue)
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)

//Websockets
import VueNativeSock from 'vue-native-websocket'
Vue.use(
  VueNativeSock,
  'ws://localhost:8080',
  {
    format: 'json',
    reconnection: true, // (Boolean) whether to reconnect automatically (false)
  }
)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
