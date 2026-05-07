<script setup>
import { onLaunch, onShow, onHide } from '@tarojs/taro'
import { useUserStore } from './store/user'

onLaunch(() => {
  console.log('GeoPunch Mini App Launched')
  const userStore = useUserStore()
  userStore.checkSession()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<template>
  <view class="app">
    <router-view />
  </view>
</template>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.app {
  min-height: 100vh;
}
</style>
