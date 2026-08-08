<template>
  <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
    <div class="w-full max-w-sm px-6 text-center">
      <div class="loader mx-auto mb-8" aria-hidden="true">
        <div v-for="index in 8" :key="index" class="box" :class="`box${index - 1}`">
          <div />
        </div>
        <div class="ground"><div /></div>
      </div>
      <h1 class="text-lg font-semibold text-foreground">正在启动服务器</h1>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ visible: boolean; message?: string }>(), {
  message: '等待 mira-app-server 健康检查通过…',
})
</script>

<style scoped>
/* Faithful port of uiverse.io/Timeless-Eve/itchy-dingo-13 (loader-3) */
.loader {
  --duration: 3s;
  --clr: var(--primary);
  --clr-light: color-mix(in srgb, var(--primary) 25%, black);
  --clr-fade: color-mix(in srgb, var(--primary) 0%, transparent);
  width: 200px;
  height: 320px;
  position: relative;
  transform-style: preserve-3d;
}

@media (max-width: 480px) {
  .loader {
    zoom: 0.44;
  }
}

.loader::before,
.loader::after {
  --r: 20.5deg;
  content: "";
  width: 320px;
  height: 140px;
  position: absolute;
  right: 32%;
  bottom: -11px;
  background: var(--background);
  transform: translateZ(200px) rotate(var(--r));
  animation: mask var(--duration) linear forwards infinite;
}

.loader::after {
  --r: -20.5deg;
  right: auto;
  left: 32%;
}

.ground {
  position: absolute;
  left: -50px;
  bottom: -120px;
  transform-style: preserve-3d;
  transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1);
}

.ground > div {
  width: 200px;
  height: 200px;
  background: linear-gradient(
    45deg,
    var(--clr) 0%,
    var(--clr) 50%,
    var(--clr-light) 50%,
    var(--clr-light) 100%
  );
  transform-style: preserve-3d;
  animation: ground var(--duration) linear forwards infinite;
}

.ground > div::before,
.ground > div::after {
  --rx: 90deg;
  --ry: 0deg;
  --x: 44px;
  --y: 162px;
  --z: -50px;
  content: "";
  width: 156px;
  height: 300px;
  opacity: 0;
  background: linear-gradient(var(--clr), var(--clr-fade));
  position: absolute;
  transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y))
    translateZ(var(--z));
  animation: ground-shine var(--duration) linear forwards infinite;
}

.ground > div::after {
  --rx: 90deg;
  --ry: 90deg;
  --x: 0;
  --y: 177px;
  --z: 150px;
}

.box {
  --x: 0;
  --y: 0;
  position: absolute;
  animation: var(--duration) linear forwards infinite;
  transform: translate(var(--x), var(--y));
}

.box > div {
  background-color: var(--clr);
  width: 48px;
  height: 48px;
  position: relative;
  transform-style: preserve-3d;
  animation: var(--duration) ease forwards infinite;
  transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0);
}

.box > div::before,
.box > div::after {
  --rx: 90deg;
  --ry: 0deg;
  --z: 24px;
  --y: -24px;
  --x: 0;
  content: "";
  position: absolute;
  background-color: inherit;
  width: inherit;
  height: inherit;
  transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y))
    translateZ(var(--z));
  filter: brightness(var(--b, 1.2));
}

.box > div::after {
  --rx: 0deg;
  --ry: 90deg;
  --x: 24px;
  --y: 0;
  --b: 1.4;
}

.box0 { --x: -220px; --y: -120px; left: 58px; top: 108px; animation-name: box-move0; }
.box1 { --x: -260px; --y: 120px; left: 25px; top: 120px; animation-name: box-move1; }
.box2 { --x: 120px; --y: -190px; left: 58px; top: 64px; animation-name: box-move2; }
.box3 { --x: 280px; --y: -40px; left: 91px; top: 120px; animation-name: box-move3; }
.box4 { --x: 60px; --y: 200px; left: 58px; top: 132px; animation-name: box-move4; }
.box5 { --x: -220px; --y: -120px; left: 25px; top: 76px; animation-name: box-move5; }
.box6 { --x: -260px; --y: 120px; left: 91px; top: 76px; animation-name: box-move6; }
.box7 { --x: -240px; --y: 200px; left: 58px; top: 87px; animation-name: box-move7; }

.box0 > div { animation-name: box-scale0; }
.box1 > div { animation-name: box-scale1; }
.box2 > div { animation-name: box-scale2; }
.box3 > div { animation-name: box-scale3; }
.box4 > div { animation-name: box-scale4; }
.box5 > div { animation-name: box-scale5; }
.box6 > div { animation-name: box-scale6; }
.box7 > div { animation-name: box-scale7; }

@keyframes box-move0 {
  12% { transform: translate(var(--x), var(--y)); }
  25%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale0 {
  6% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  14%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move1 {
  16% { transform: translate(var(--x), var(--y)); }
  29%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale1 {
  10% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  18%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move2 {
  20% { transform: translate(var(--x), var(--y)); }
  33%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale2 {
  14% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  22%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move3 {
  24% { transform: translate(var(--x), var(--y)); }
  37%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale3 {
  18% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  26%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move4 {
  28% { transform: translate(var(--x), var(--y)); }
  41%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale4 {
  22% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  30%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move5 {
  32% { transform: translate(var(--x), var(--y)); }
  45%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale5 {
  26% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  34%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move6 {
  36% { transform: translate(var(--x), var(--y)); }
  49%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale6 {
  30% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  38%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}
@keyframes box-move7 {
  40% { transform: translate(var(--x), var(--y)); }
  53%, 52% { transform: translate(0, 0); }
  80% { transform: translate(0, -32px); }
  90%, 100% { transform: translate(0, 188px); }
}
@keyframes box-scale7 {
  34% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
  42%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
}

@keyframes ground {
  0%, 65% {
    transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px)
      translateZ(100px) scale(0);
  }
  75%, 90% {
    transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px)
      translateZ(100px) scale(1);
  }
  100% {
    transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px)
      translateZ(100px) scale(0);
  }
}

@keyframes ground-shine {
  0%, 70% { opacity: 0; }
  75%, 87% { opacity: 0.2; }
  100% { opacity: 0; }
}

@keyframes mask {
  0%, 65% { opacity: 0; }
  66%, 100% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .box, .box > div, .ground, .ground > div,
  .loader::before, .loader::after,
  .ground > div::before, .ground > div::after {
    animation-play-state: paused;
  }
}
</style>
