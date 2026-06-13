import { createApp } from 'vue'
// 旧 v0.5 style.css 先引入，再用新 shadcn 主题(index.css)覆盖同名变量，
// 避免旧 --primary(#3498db 蓝) 覆盖原型主题色 #030213
import './style.css'
import './styles/index.css'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
