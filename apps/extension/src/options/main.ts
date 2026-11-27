import { createApp } from 'vue'
import './style.css'
import Options from './Options.vue'
import { installFonts } from '../lib/fonts'

installFonts()

createApp(Options).mount('#app')
