import { ref, watchEffect } from 'vue'

const isDark = ref(true)

function initTheme() {
  const saved = localStorage.getItem('punk-theme')
  if (saved) {
    isDark.value = saved === 'dark'
  }
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('punk-theme', isDark.value ? 'dark' : 'light')
}

watchEffect(() => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

initTheme()

export function useTheme() {
  return { isDark, toggleTheme }
}
