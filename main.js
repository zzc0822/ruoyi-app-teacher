import Vue from 'vue'
import App from './App'
import store from './store' // store
import plugins from './plugins' // plugins
import './permission' // permission
import { getDicts } from "@/api/system/dict/data"

// 引入uView UI（学生端需要）
import uView from '@/uni_modules/uview-ui'
Vue.use(uView)

// 引入campus工具类
import { handleCampusUrl, diffTime, handelTimeFormat } from '@/utils/campus'
Vue.prototype.handleCampusUrl = handleCampusUrl
Vue.prototype.diffTime = diffTime
Vue.prototype.handelTimeFormat = handelTimeFormat

Vue.use(plugins)

Vue.config.productionTip = false
Vue.prototype.$store = store
Vue.prototype.getDicts = getDicts

App.mpType = 'app'

const app = new Vue({
  ...App
})

app.$mount()
