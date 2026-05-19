<template>
  <div class="not-found-view">
    <div class="not-found-container">
      <div class="not-found-icon">
        <span class="material-icons">warning</span>
      </div>
      
      <h1>页面未找到</h1>
      <p>抱歉，您访问的页面不存在或已被移动。</p>
      
      <div class="not-found-actions">
        <Button
          @click="$router.push('/')"
        >
          <span class="material-icons mr-2">home</span>
          返回主页
        </Button>
        <Button
          variant="secondary"
          @click="$router.go(-1)"
        >
          <span class="material-icons mr-2">arrow_back</span>
          返回上一页
        </Button>
      </div>
      
      <div class="not-found-help">
        <h3>您可以尝试：</h3>
        <ul>
          <li>检查 URL 是否正确</li>
          <li>使用导航菜单浏览其他页面</li>
          <li>联系管理员获取帮助</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<style scoped>
.not-found-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: #f8f9fa;
}

.not-found-container {
  text-align: center;
  max-width: 500px;
}

.not-found-icon {
  font-size: 4rem;
  color: #dc3545;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 1rem;
}

p {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.not-found-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.not-found-help {
  text-align: left;
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.not-found-help h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.not-found-help ul {
  margin: 0;
  padding-left: 1.5rem;
}

.not-found-help li {
  margin-bottom: 0.5rem;
  color: #666;
}

@media (max-width: 640px) {
  .not-found-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .not-found-help {
    text-align: center;
  }
  
  .not-found-help ul {
    text-align: left;
  }
}
</style>
