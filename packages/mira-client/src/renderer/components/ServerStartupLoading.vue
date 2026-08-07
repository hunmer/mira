<template>
  <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
    <div class="w-full max-w-sm px-6 text-center">
      <div v-if="!failed" class="loader mx-auto mb-8" aria-hidden="true">
        <div v-for="index in 8" :key="index" class="box" :class="`box${index - 1}`">
          <div />
        </div>
        <div class="ground"><div /></div>
      </div>
      <h1 class="text-lg font-semibold text-foreground">{{ failed ? '服务器启动失败' : '正在启动服务器' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ message }}</p>
      <button v-if="failed" type="button" class="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" @click="emit('retry')">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ visible: boolean; failed?: boolean; message?: string }>(), {
  failed: false,
  message: '等待 mira-app-server 健康检查通过…',
})
const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped>
.loader {
  --clr: var(--primary);
  position: relative;
  width: 160px;
  height: 190px;
  perspective: 900px;
  transform: rotateX(58deg) rotateZ(34deg);
  transform-style: preserve-3d;
}

.box,
.ground {
  position: absolute;
  left: 56px;
  top: 62px;
  width: 44px;
  height: 44px;
  transform-style: preserve-3d;
}

.box {
  --x: 0px;
  --y: 0px;
  animation: box-move 3.2s infinite ease-in-out;
}

.box > div {
  width: 100%;
  height: 100%;
  background: var(--clr);
  border-radius: 3px;
  box-shadow: inset -9px -9px 0 rgb(0 0 0 / 0.14), inset 7px 7px 0 rgb(255 255 255 / 0.18);
  transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0);
  animation: box-scale 3.2s infinite ease-in-out;
}

.box > div::before,
.box > div::after {
  position: absolute;
  display: block;
  content: '';
  background: color-mix(in srgb, var(--clr) 72%, black);
  transform-origin: 0 0;
}

.box > div::before {
  width: 44px;
  height: 13px;
  left: 0;
  top: 44px;
  transform: skewX(-45deg) scaleY(0.72);
}

.box > div::after {
  width: 13px;
  height: 44px;
  left: 44px;
  top: 0;
  transform: skewY(-45deg) scaleX(0.72);
}

.box0 { --x: -52px; --y: -30px; }
.box1 { --x: 0px; --y: -30px; }
.box2 { --x: 52px; --y: -30px; }
.box3 { --x: -52px; --y: 22px; }
.box4 { --x: 0px; --y: 22px; }
.box5 { --x: 52px; --y: 22px; }
.box6 { --x: -26px; --y: 74px; }
.box7 { --x: 26px; --y: 74px; }

.box1, .box1 > div { animation-delay: 0.12s; }
.box2, .box2 > div { animation-delay: 0.24s; }
.box3, .box3 > div { animation-delay: 0.36s; }
.box4, .box4 > div { animation-delay: 0.48s; }
.box5, .box5 > div { animation-delay: 0.60s; }
.box6, .box6 > div { animation-delay: 0.72s; }
.box7, .box7 > div { animation-delay: 0.84s; }

.ground {
  left: 32px;
  top: 118px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(0 0 0 / 0.22), transparent 68%);
  animation: ground 3.2s infinite ease-in-out;
}

.ground > div {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--clr);
  filter: blur(14px);
  opacity: 0;
  animation: ground-shine 3.2s infinite ease-in-out;
}

@keyframes box-move {
  12% { transform: translate(var(--x), var(--y)); }
  25%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}

@keyframes box-scale {
  6% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  14%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}

@keyframes ground {
  0%, 65% { transform: rotateX(90deg) translateZ(100px) scale(0); }
  75%, 90% { transform: rotateX(90deg) translateZ(100px) scale(1); }
  100% { transform: rotateX(90deg) translateZ(100px) scale(0); }
}

@keyframes ground-shine {
  0%, 70% { opacity: 0; }
  75%, 87% { opacity: 0.2; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .box, .box > div, .ground, .ground > div { animation-play-state: paused; }
}
</style>
