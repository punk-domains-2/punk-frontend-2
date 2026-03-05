import { createApp } from 'vue'
import { WagmiPlugin } from '@wagmi/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import { config } from './config/wagmi'
import './style.css'

const app = createApp(App)
const queryClient = new QueryClient()

app.use(WagmiPlugin, { config })
app.use(VueQueryPlugin, { queryClient })
app.use(router)
app.mount('#app')
