import * as THREE from 'three'
import { reactive, shallowRef, type Ref } from 'vue'
import type { TresContext } from '@tresjs/core'

/** 列表项：Mesh 或 Group/Object3D */
export interface SceneNode {
  name: string
  object: THREE.Object3D
  type: string
  triangles?: number
  vertices?: number
}

export interface MaterialNode {
  name: string
  material: THREE.Material
}

export interface AnimationNode {
  name: string
  uuid: string
}

/**
 * 简单标量状态：放进 reactive 对象，模板里自动解包，访问无 .value。
 */
export const store = reactive({
  fileName: '3D model',
  fileUrl: '',
  mimeType: '',
  wireframe: false,
  showGrid: true,
  autoRotate: false,
  isLoading: false,
  loadError: '',
})

/**
 * three 对象 / 列表：用独立 shallowRef 导出（不能进 reactive，避免深代理 + 解包错乱）。
 * 访问时带 .value。
 */
export const ctxRef: Ref<TresContext | null> = shallowRef(null)
export const sceneRoot: Ref<THREE.Object3D | null> = shallowRef(null)
export const sceneNodes: Ref<SceneNode[]> = shallowRef([])
export const materials: Ref<MaterialNode[]> = shallowRef([])
export const animations: Ref<AnimationNode[]> = shallowRef([])
export const selectedObject: Ref<THREE.Object3D | null> = shallowRef(null)
export const selectedMaterial: Ref<THREE.Material | null> = shallowRef(null)

/** 模型聚合统计 */
export const stats = shallowRef({ vertices: 0, triangles: 0, meshes: 0, materials: 0 })

/** 便捷取值（脚本里用），指向 ctxRef */
function ctx() {
  return ctxRef.value
}

export function useViewerStore() {
  return {
    store,
    stats,
    ctxRef,
    sceneRoot,
    sceneNodes,
    materials,
    animations,
    selectedObject,
    selectedMaterial,
  }
}

// ===================== 场景收集 + 统计 =====================

function countGeometry(geo: THREE.BufferGeometry) {
  const position = geo.getAttribute('position')
  const vertices = position ? position.count : 0
  const index = geo.getIndex()
  const triangles = index ? Math.round(index.count / 3) : Math.round(vertices / 3)
  return { vertices, triangles }
}

export function collectScene(root: THREE.Object3D, clips: THREE.AnimationClip[] = []) {
  const nodes: SceneNode[] = []
  const matMap = new Map<string, THREE.Material>()
  let totalVerts = 0
  let totalTris = 0

  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh) {
      let verts = 0
      let tris = 0
      if (mesh.geometry) {
        const c = countGeometry(mesh.geometry)
        verts = c.vertices
        tris = c.triangles
        totalVerts += verts
        totalTris += tris
      }
      nodes.push({
        name: mesh.name || `Mesh_${nodes.length}`,
        object: mesh,
        type: 'Mesh',
        vertices: verts,
        triangles: tris,
      })
      const mat = mesh.material
      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          const key = m.name || `Material_${matMap.size}`
          if (!matMap.has(key)) matMap.set(key, m)
        })
      } else if (mat) {
        const key = mat.name || `Material_${matMap.size}`
        if (!matMap.has(key)) matMap.set(key, mat)
      }
    } else if ((obj.type === 'Group' || obj.type === 'Object3D') && obj.name) {
      nodes.push({ name: obj.name, object: obj, type: obj.type })
    }
  })

  sceneRoot.value = root
  sceneNodes.value = nodes
  materials.value = Array.from(matMap.entries()).map(([name, material]) => ({ name, material }))
  animations.value = (clips || []).map((clip) => ({ name: clip.name || clip.uuid, uuid: clip.uuid }))
  stats.value = {
    vertices: totalVerts,
    triangles: totalTris,
    meshes: nodes.filter((n) => n.type === 'Mesh').length,
    materials: matMap.size,
  }
}

// ===================== 相机 / 画布操作 =====================

export function fitCameraToObject(object?: THREE.Object3D | null) {
  const c = ctx()
  if (!c) return
  const target = object || sceneRoot.value
  if (!target) return

  const box = new THREE.Box3().setFromObject(target)
  if (box.isEmpty()) return

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  // TresContext.camera = useCameraManager 返回值 { cameras, activeCamera, ... }
  // 真实相机在 activeCamera.value
  const cam = (c.camera as any)?.activeCamera?.value as THREE.PerspectiveCamera | undefined
  if (!cam) return

  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const fov = (cam.fov || 45) * (Math.PI / 180)
  let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  dist *= 1.8

  cam.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist)
  cam.lookAt(center)
  cam.updateProjectionMatrix?.()

  const controls = c.controls?.value as any
  if (controls) {
    controls.target.copy(center)
    controls.update?.()
  }
}

export function resetCamera() {
  fitCameraToObject()
}

export function setWireframe(on: boolean) {
  store.wireframe = on
  const root = sceneRoot.value
  if (!root) return
  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as any
    if (Array.isArray(mat)) mat.forEach((m: any) => (m.wireframe = on))
    else if (mat) mat.wireframe = on
  })
}

export function exportScreenshot(fileName = 'model') {
  const c = ctx()
  if (!c) return
  // TresContext.renderer = { instance: WebGLRenderer, ... }
  const renderer = (c.renderer as any)?.instance
  if (!renderer) return
  try {
    const cam = (c.camera as any)?.activeCamera?.value as THREE.PerspectiveCamera | undefined
    if (cam) renderer.render(c.scene.value, cam)
  } catch {
    /* 忽略 */
  }
  const dataUrl = renderer.domElement.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${fileName}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
