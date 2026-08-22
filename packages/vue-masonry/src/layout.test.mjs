import assert from "node:assert/strict"
import test from "node:test"
import { layoutFill } from "./layout.ts"

const getMeta = (item) => ({ colSpan: item.colSpan, height: item.height })
const getKey = (item) => item.id

function fill(items) {
  return layoutFill(items, 3, 100, 10, 80, getMeta, getKey)
}

test("fill 布局追加素材时保持已有素材的位置和顺序", () => {
  const items = [
    { id: "first", colSpan: 1, height: 100 },
    { id: "wide", colSpan: 2, height: 80 },
    { id: "third", colSpan: 1, height: 60 },
    { id: "fourth", colSpan: 1, height: 40 }
  ]
  const full = fill(items).items

  assert.deepEqual(full.map((placed) => placed.item.id), items.map((item) => item.id))
  for (let length = 1; length < items.length; length++) {
    const prefix = fill(items.slice(0, length)).items
    assert.deepEqual(
      full.slice(0, length).map(({ item, left, top }) => ({ id: item.id, left, top })),
      prefix.map(({ item, left, top }) => ({ id: item.id, left, top }))
    )
  }
})

test("fill 布局仍会用后续单列素材回填已有洞区", () => {
  const items = [
    { id: "tall", colSpan: 1, height: 200 },
    { id: "short", colSpan: 1, height: 50 },
    { id: "wide", colSpan: 2, height: 100 },
    { id: "filler", colSpan: 1, height: 40 }
  ]
  const placed = fill(items).items
  const wide = placed.find((item) => item.item.id === "wide")
  const filler = placed.find((item) => item.item.id === "filler")

  assert.deepEqual({ left: wide?.left, top: wide?.top }, { left: 110, top: 60 })
  assert.deepEqual({ left: filler?.left, top: filler?.top }, { left: 220, top: 0 })
})

test("fill 布局会用后续跨列素材回填连续洞区", () => {
  const items = [
    { id: "tall", colSpan: 1, height: 200 },
    { id: "short", colSpan: 1, height: 50 },
    { id: "wide", colSpan: 3, height: 100 },
    { id: "wide-filler", colSpan: 2, height: 40 }
  ]
  const placed = layoutFill(items, 4, 100, 10, 80, getMeta, getKey).items
  const filler = placed.find((item) => item.item.id === "wide-filler")

  assert.deepEqual({ left: filler?.left, top: filler?.top }, { left: 220, top: 0 })
})
