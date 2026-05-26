<template>
  <div ref="container" class="w-full h-full" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`

function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error('Shader compile error: ' + info)
  }
  return shader
}

const props = withDefaults(defineProps<{
  colorStops?: string[]
  amplitude?: number
  blend?: number
  speed?: number
}>(), {
  colorStops: () => ['#3A29FF', '#FF94B4', '#FF3232'],
  amplitude: 1.0,
  blend: 0.5,
  speed: 1.0,
})

const container = ref<HTMLDivElement>()
let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let animId = 0
let startTime = 0

const uniformLocations: Record<string, WebGLUniformLocation | null> = {}

function setUniforms() {
  if (!gl || !program) return
  gl.useProgram(program)

  const stops = props.colorStops.map(hexToRGB)
  stops.forEach((c, i) => {
    const loc = gl!.getUniformLocation(program!, `uColorStops[${i}]`)
    if (loc) gl!.uniform3f(loc, c[0], c[1], c[2])
  })

  const uRes = uniformLocations.uResolution
  if (uRes) gl!.uniform2f(uRes, container.value!.offsetWidth, container.value!.offsetHeight)
  const uAmp = uniformLocations.uAmplitude
  if (uAmp) gl!.uniform1f(uAmp, props.amplitude)
  const uBlend = uniformLocations.uBlend
  if (uBlend) gl!.uniform1f(uBlend, props.blend)
}

function resize() {
  if (!gl || !container.value) return
  const w = container.value.offsetWidth
  const h = container.value.offsetHeight
  const canvas = gl.canvas as HTMLCanvasElement
  canvas.width = w * devicePixelRatio
  canvas.height = h * devicePixelRatio
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  gl.viewport(0, 0, canvas.width, canvas.height)
  if (uniformLocations.uResolution) {
    gl.uniform2f(uniformLocations.uResolution, w, h)
  }
}

function initGL() {
  const el = container.value
  if (!el) return

  const canvas = document.createElement('canvas')
  el.appendChild(canvas)

  gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true })
  if (!gl) return

  gl.clearColor(0, 0, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
  program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(program))
  }

  gl.useProgram(program)

  // Full-screen triangle
  const positions = new Float32Array([-1, -1, 3, -1, -1, 3])
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  uniformLocations.uTime = gl.getUniformLocation(program, 'uTime')
  uniformLocations.uAmplitude = gl.getUniformLocation(program, 'uAmplitude')
  uniformLocations.uResolution = gl.getUniformLocation(program, 'uResolution')
  uniformLocations.uBlend = gl.getUniformLocation(program, 'uBlend')

  setUniforms()
  resize()

  startTime = performance.now()
  animate()
}

function animate() {
  if (!gl || !program) return
  animId = requestAnimationFrame(animate)

  const elapsed = (performance.now() - startTime) * 0.001
  const time = elapsed * props.speed * 0.1

  gl.useProgram(program)
  if (uniformLocations.uTime) gl.uniform1f(uniformLocations.uTime, time)

  // Update dynamic props
  const stops = props.colorStops.map(hexToRGB)
  stops.forEach((c, i) => {
    const loc = gl!.getUniformLocation(program!, `uColorStops[${i}]`)
    if (loc) gl!.uniform3f(loc, c[0], c[1], c[2])
  })
  if (uniformLocations.uAmplitude) gl.uniform1f(uniformLocations.uAmplitude, props.amplitude)
  if (uniformLocations.uBlend) gl.uniform1f(uniformLocations.uBlend, props.blend)

  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

function cleanup() {
  cancelAnimationFrame(animId)
  if (gl) {
    const ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    const canvas = gl.canvas as HTMLCanvasElement
    if (container.value && canvas.parentNode === container.value) {
      container.value.removeChild(canvas)
    }
    gl = null
    program = null
  }
}

const onResize = () => resize()

onMounted(() => {
  initGL()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cleanup()
})
</script>
