<template>
  <div class="home-view flex-1 flex flex-col items-center justify-center bg-gray-50">
    <div class="home-empty text-center">
      <span class="material-icons home-empty__icon">tab</span>
      <h3 class="home-empty__title">从侧边栏选择内容</h3>
      <p class="home-empty__desc">点击左侧文件夹或标签，打开新标签页查看内容</p>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  tabId?: string
  libraryId?: string
}

withDefaults(defineProps<Props>(), {
  tabId: 'home'
})

</script>

<style scoped>
.home-view {
  min-height: 100%;
}

.home-empty {
  animation: fadeIn .3s ease-out;
}

.home-empty__icon {
  font-size: 56px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.home-empty__title {
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.home-empty__desc {
  font-size: 13px;
  color: #9ca3af;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>