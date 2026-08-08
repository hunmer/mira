import * as THREE from 'three'
import { shallowRef } from 'vue'

/**
 * 选中高亮：备份原材质 → 替换为线框高亮材质 → 取消时恢复。
 * 不依赖后处理（EffectComposer/OutlinePass），最稳。
 */
const highlightMaterial = new THREE.MeshBasicMaterial({
  color: 0x6ee7bf,
  wireframe: true,
  transparent: true,
  opacity: 0.55,
  depthTest: false,
})

/** 被高亮 mesh 的原材质备份 */
const backups = new Map<THREE.Object3D, THREE.Material | THREE.Material[]>()

/** 当前高亮的对象（单选） */
const highlighted = shallowRef<THREE.Object3D | null>(null)

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return (obj as THREE.Mesh).isMesh === true
}

/** 高亮单个对象（仅 Mesh 会替换材质；Group/Object3D 仅记录选择，不改材质） */
export function highlightObject(obj: THREE.Object3D | null) {
  // 先清除上一个
  clearHighlight()
  if (!obj) return
  highlighted.value = obj
  if (isMesh(obj)) {
    backups.set(obj, obj.material)
    obj.material = highlightMaterial
  }
}

/** 清除高亮，恢复原材质 */
export function clearHighlight() {
  backups.forEach((mat, obj) => {
    if (isMesh(obj)) obj.material = mat
  })
  backups.clear()
  highlighted.value = null
}

/** 卸载时释放 */
export function disposeHighlight() {
  clearHighlight()
  highlightMaterial.dispose()
}

export function useHighlight() {
  return { highlightObject, clearHighlight, disposeHighlight, highlighted }
}
