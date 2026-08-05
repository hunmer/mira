<template>
  <transition
    :name="transitionName"
    :mode="mode"
    :appear="appear"
    :css="css"
    :duration="duration"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <slot />
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
  name?: string
  mode?: 'in-out' | 'out-in' | 'default'
  appear?: boolean
  css?: boolean
  duration?: number | { enter: number; leave: number }
  delay?: number
  easing?: string
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  scale?: number
  rotate?: number
  opacity?: boolean
  blur?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  name: 'fade',
  mode: 'default',
  appear: false,
  css: true,
  duration: 300,
  delay: 0,
  easing: 'ease',
  direction: 'up',
  distance: 20,
  scale: 0.95,
  rotate: 0,
  opacity: true,
  blur: false,
  disabled: false
})

// Emits
const emit = defineEmits<{
  beforeEnter: [el: Element]
  enter: [el: Element, done: () => void]
  afterEnter: [el: Element]
  beforeLeave: [el: Element]
  leave: [el: Element, done: () => void]
  afterLeave: [el: Element]
}>()

// 计算属性
const transitionName = computed(() => {
  if (props.disabled) return ''
  
  // 预定义的动画类型
  const animations = {
    'fade': 'mira-fade',
    'slide': `mira-slide-${props.direction}`,
    'scale': 'mira-scale',
    'zoom': 'mira-zoom',
    'flip': 'mira-flip',
    'bounce': 'mira-bounce',
    'elastic': 'mira-elastic',
    'blur': 'mira-blur'
  }
  
  return animations[props.name as keyof typeof animations] || props.name
})

// 事件处理
const onBeforeEnter = (el: Element) => {
  if (props.disabled) return
  
  const element = el as HTMLElement
  
  // 设置初始样式
  if (props.css) {
    element.style.transition = 'none'
    
    if (props.opacity) {
      element.style.opacity = '0'
    }
    
    // 根据动画类型设置初始变换
    const transforms: string[] = []
    
    if (props.name.includes('slide')) {
      const directions = {
        'up': `translateY(${props.distance}px)`,
        'down': `translateY(-${props.distance}px)`,
        'left': `translateX(${props.distance}px)`,
        'right': `translateX(-${props.distance}px)`
      }
      transforms.push(directions[props.direction])
    }
    
    if (props.name.includes('scale') || props.name.includes('zoom')) {
      transforms.push(`scale(${props.scale})`)
    }
    
    if (props.rotate !== 0) {
      transforms.push(`rotate(${props.rotate}deg)`)
    }
    
    if (transforms.length > 0) {
      element.style.transform = transforms.join(' ')
    }
    
    if (props.blur) {
      element.style.filter = 'blur(4px)'
    }
    
    // 强制重绘
    element.offsetHeight
  }
  
  emit('beforeEnter', el)
}

const onEnter = (el: Element, done: () => void) => {
  if (props.disabled) {
    done()
    return
  }
  
  const element = el as HTMLElement
  
  if (props.css) {
    // 设置过渡效果
    const transitions: string[] = []
    
    if (props.opacity) {
      transitions.push('opacity')
    }
    
    transitions.push('transform', 'filter')
    
    const durationMs = typeof props.duration === 'number' 
      ? props.duration 
      : props.duration.enter
    
    element.style.transition = transitions
      .map(prop => `${prop} ${durationMs}ms ${props.easing}`)
      .join(', ')
    
    if (props.delay > 0) {
      element.style.transitionDelay = `${props.delay}ms`
    }
    
    // 应用最终样式
    setTimeout(() => {
      if (props.opacity) {
        element.style.opacity = '1'
      }
      
      element.style.transform = 'none'
      element.style.filter = 'none'
    }, 16) // 下一帧
    
    // 监听过渡结束
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element) {
        element.removeEventListener('transitionend', handleTransitionEnd)
        done()
      }
    }
    
    element.addEventListener('transitionend', handleTransitionEnd)
    
    // 备用完成回调
    setTimeout(() => {
      element.removeEventListener('transitionend', handleTransitionEnd)
      done()
    }, durationMs + props.delay + 100)
  } else {
    done()
  }
  
  emit('enter', el, done)
}

const onAfterEnter = (el: Element) => {
  if (props.disabled) return
  
  const element = el as HTMLElement
  
  // 清理样式
  element.style.transition = ''
  element.style.transitionDelay = ''
  
  emit('afterEnter', el)
}

const onBeforeLeave = (el: Element) => {
  if (props.disabled) return
  
  const element = el as HTMLElement
  
  // 确保元素有明确的尺寸
  const rect = element.getBoundingClientRect()
  element.style.width = `${rect.width}px`
  element.style.height = `${rect.height}px`
  element.style.position = 'absolute'
  
  emit('beforeLeave', el)
}

const onLeave = (el: Element, done: () => void) => {
  if (props.disabled) {
    done()
    return
  }
  
  const element = el as HTMLElement
  
  if (props.css) {
    const transitions: string[] = []
    
    if (props.opacity) {
      transitions.push('opacity')
    }
    
    transitions.push('transform', 'filter')
    
    const durationMs = typeof props.duration === 'number' 
      ? props.duration 
      : props.duration.leave
    
    element.style.transition = transitions
      .map(prop => `${prop} ${durationMs}ms ${props.easing}`)
      .join(', ')
    
    // 应用离场样式
    setTimeout(() => {
      if (props.opacity) {
        element.style.opacity = '0'
      }
      
      const transforms: string[] = []
      
      if (props.name.includes('slide')) {
        const directions = {
          'up': `translateY(-${props.distance}px)`,
          'down': `translateY(${props.distance}px)`,
          'left': `translateX(-${props.distance}px)`,
          'right': `translateX(${props.distance}px)`
        }
        transforms.push(directions[props.direction])
      }
      
      if (props.name.includes('scale') || props.name.includes('zoom')) {
        transforms.push(`scale(${props.scale})`)
      }
      
      if (props.rotate !== 0) {
        transforms.push(`rotate(-${props.rotate}deg)`)
      }
      
      if (transforms.length > 0) {
        element.style.transform = transforms.join(' ')
      }
      
      if (props.blur) {
        element.style.filter = 'blur(4px)'
      }
    }, 16)
    
    // 监听过渡结束
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element) {
        element.removeEventListener('transitionend', handleTransitionEnd)
        done()
      }
    }
    
    element.addEventListener('transitionend', handleTransitionEnd)
    
    // 备用完成回调
    setTimeout(() => {
      element.removeEventListener('transitionend', handleTransitionEnd)
      done()
    }, durationMs + 100)
  } else {
    done()
  }
  
  emit('leave', el, done)
}

const onAfterLeave = (el: Element) => {
  if (props.disabled) return
  
  const element = el as HTMLElement
  
  // 清理样式
  element.style.width = ''
  element.style.height = ''
  element.style.position = ''
  element.style.transition = ''
  element.style.transform = ''
  element.style.opacity = ''
  element.style.filter = ''
  
  emit('afterLeave', el)
}
</script>

<style>
/* 预定义动画类 */

/* 淡入淡出 */
.mira-fade-enter-active,
.mira-fade-leave-active {
  transition: opacity 250ms ease;
}

.mira-fade-enter-from,
.mira-fade-leave-to {
  opacity: 0;
}

/* 滑动动画 */
.mira-slide-up-enter-active,
.mira-slide-up-leave-active,
.mira-slide-down-enter-active,
.mira-slide-down-leave-active,
.mira-slide-left-enter-active,
.mira-slide-left-leave-active,
.mira-slide-right-enter-active,
.mira-slide-right-leave-active {
  transition: all 250ms ease;
}

.mira-slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.mira-slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.mira-slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.mira-slide-down-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.mira-slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.mira-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.mira-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.mira-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 缩放动画 */
.mira-scale-enter-active,
.mira-scale-leave-active {
  transition: all 250ms ease;
}

.mira-scale-enter-from,
.mira-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 放大动画 */
.mira-zoom-enter-active,
.mira-zoom-leave-active {
  transition: all 250ms ease;
}

.mira-zoom-enter-from,
.mira-zoom-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* 翻转动画 */
.mira-flip-enter-active,
.mira-flip-leave-active {
  transition: all 250ms ease;
}

.mira-flip-enter-from {
  opacity: 0;
  transform: rotateY(90deg);
}

.mira-flip-leave-to {
  opacity: 0;
  transform: rotateY(-90deg);
}

/* 弹跳动画 */
.mira-bounce-enter-active {
  animation: bounceIn 0.6s ease-out;
}

.mira-bounce-leave-active {
  animation: bounceOut 0.4s ease-in;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bounceOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  30% {
    transform: scale(1.05);
  }
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
}

/* 弹性动画 */
.mira-elastic-enter-active {
  animation: elasticIn 0.8s ease-out;
}

.mira-elastic-leave-active {
  animation: elasticOut 0.5s ease-in;
}

@keyframes elasticIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  60% {
    transform: scale(1.1) translateY(-5px);
  }
  80% {
    transform: scale(0.95) translateY(2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes elasticOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  40% {
    transform: scale(1.05) translateY(-2px);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
}

/* 模糊动画 */
.mira-blur-enter-active,
.mira-blur-leave-active {
  transition: all 250ms ease;
}

.mira-blur-enter-from,
.mira-blur-leave-to {
  opacity: 0;
  filter: blur(4px);
}

/* 减少动画（无障碍访问） */
@media (prefers-reduced-motion: reduce) {
  .mira-fade-enter-active,
  .mira-fade-leave-active,
  .mira-slide-up-enter-active,
  .mira-slide-up-leave-active,
  .mira-slide-down-enter-active,
  .mira-slide-down-leave-active,
  .mira-slide-left-enter-active,
  .mira-slide-left-leave-active,
  .mira-slide-right-enter-active,
  .mira-slide-right-leave-active,
  .mira-scale-enter-active,
  .mira-scale-leave-active,
  .mira-zoom-enter-active,
  .mira-zoom-leave-active,
  .mira-flip-enter-active,
  .mira-flip-leave-active,
  .mira-blur-enter-active,
  .mira-blur-leave-active {
    transition: none !important;
    animation: none !important;
  }
  
  .mira-bounce-enter-active,
  .mira-bounce-leave-active,
  .mira-elastic-enter-active,
  .mira-elastic-leave-active {
    animation: none !important;
  }
}
</style>
