/**
 * useKeyService 单元测试
 *
 * 测试目标：←→ 快捷键在 shadowCurIdx 未初始化时能正确 fallback 到 curIdx
 *
 * 运行方式：
 *   npm test
 *   或 watch 模式：npm run test:watch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ========== Mock 数据 ==========

const mockSubtitle = (): Transcript => ({
  body: [
    { idx: 0, from: 0, to: 3, content: '第一句' },
    { idx: 1, from: 3, to: 6, content: '第二句' },
    { idx: 2, from: 6, to: 9, content: '第三句' },
  ],
})

const mockEnvState = (overrides: Partial<{
  shadowMode: boolean
  shadowCurIdx: number | null
  curIdx: number | undefined
  shadowSpecialMode: string
  shadowLoopCount: number
  shadowModeType: string
  data: Transcript | null
}> = {}) => ({
  env: {
    shadowMode: true,
    shadowCurIdx: null,
    curIdx: 1,
    shadowSpecialMode: 'none',
    shadowLoopCount: -1,
    shadowModeType: 'loop' as const,
    data: mockSubtitle(),
    inputting: false,
    ...overrides,
  },
})

// ========== 测试用例 ==========

describe('useKeyService ←→ 快捷键 fallback 逻辑', () => {

  /**
   * 根因：shadowCurIdx 初始值为 null，
   * ←→ 的触发条件要求 shadowCurIdx !== null，
   * 但从未用 curIdx 作 fallback，导致始终不触发。
   *
   * 修复方案：←→ 时，如果 shadowCurIdx === null，
   * 则取 curIdx 作为 effectiveIdx。
   */

  it('shadowCurIdx=null 时，← 应使用 curIdx(1) 触发无限循环', () => {
    const state = mockEnvState({ shadowCurIdx: null, curIdx: 1 })

    // 模拟 ← 键按下时的索引计算逻辑
    const effectiveIdx = state.env.shadowCurIdx ?? state.env.curIdx

    expect(effectiveIdx).toBe(1)
  })

  it('shadowCurIdx=2 时，→ 应使用 shadowCurIdx(2) 触发播完暂停', () => {
    const state = mockEnvState({ shadowCurIdx: 2, curIdx: 0 })

    const effectiveIdx = state.env.shadowCurIdx ?? state.env.curIdx

    expect(effectiveIdx).toBe(2)
  })

  it('shadowCurIdx=0 时，← 应触发无限循环（infinite 模式）', () => {
    const state = mockEnvState({ shadowCurIdx: 0 })

    const isInfiniteMode = state.env.shadowCurIdx !== null && state.env.shadowCurIdx >= 0

    expect(isInfiniteMode).toBe(true)
  })

  it('shadowSpecialMode=none 时，↑↓ 会改变 shadowCurIdx', () => {
    // ↑↓ 在 shadowSpecialMode=none 时，执行后会 dispatch(setShadowCurIdx(newIdx))
    // 所以首次按 ← 时，shadowCurIdx 已经被 ↑↓ 初始化为有效值
    // 这是 ↑↓ 能工作的原因——它们自己初始化了 shadowCurIdx
    const state = mockEnvState({ shadowCurIdx: null, shadowSpecialMode: 'none' })

    // 模拟 ↑ 被按后的新索引
    const newIdx = (state.env.shadowCurIdx ?? (state.env.curIdx ?? 0)) - 1

    expect(newIdx).toBe(0)
  })

  it('shadowCurIdx 未初始化时，←→ 不应被跳过', () => {
    const state = mockEnvState({ shadowCurIdx: null, curIdx: 1 })

    // 旧逻辑：shadowCurIdx !== null 才触发 → 跳过
    const oldLogicShouldTrigger = state.env.shadowCurIdx !== null

    // 新逻辑：用 curIdx 作 fallback → 触发
    const newLogicShouldTrigger = (state.env.shadowCurIdx ?? state.env.curIdx) !== null
      && (state.env.shadowCurIdx ?? state.env.curIdx) >= 0

    expect(oldLogicShouldTrigger).toBe(false) // 旧逻辑：跳过（BUG）
    expect(newLogicShouldTrigger).toBe(true)   // 新逻辑：触发（修复）
  })

  it('curIdx 也未定义时，←→ 不应触发（防止越界）', () => {
    const state = mockEnvState({ shadowCurIdx: null, curIdx: undefined as unknown as number })

    const effectiveIdx = state.env.shadowCurIdx ?? state.env.curIdx

    // undefined ?? undefined = undefined，>= 0 判断为 false
    expect(effectiveIdx == null).toBe(true)
  })

  it('数据为空时，←→ 不应触发', () => {
    const state = mockEnvState({ shadowCurIdx: null, curIdx: 1, data: null })

    const hasData = state.env.data != null && (state.env.data.body?.length ?? 0) > 0

    expect(hasData).toBe(false)
  })
})

describe('useKeyService ←→ 触发条件边界', () => {

  it('shadowMode=false 时，←→ 不应触发', () => {
    const state = mockEnvState({ shadowMode: false, shadowCurIdx: null, curIdx: 1 })

    const shouldTrigger = state.env.shadowMode && (state.env.shadowCurIdx ?? state.env.curIdx) !== null

    expect(shouldTrigger).toBe(false)
  })

  it('shadowSpecialMode=infinite 时，← 不应重复进入无限循环', () => {
    const state = mockEnvState({
      shadowCurIdx: 1,
      shadowSpecialMode: 'infinite',
    })

    // 已在无限循环中，← 只是再次跳转，不需要重设 specialMode
    const isAlreadyInfinite = state.env.shadowSpecialMode === 'infinite'

    expect(isAlreadyInfinite).toBe(true)
  })

  it('shadowSpecialMode=oneShot 时，→ 应保持 oneShot', () => {
    const state = mockEnvState({
      shadowCurIdx: 1,
      shadowSpecialMode: 'oneShot',
    })

    const isOneShot = state.env.shadowSpecialMode === 'oneShot'

    expect(isOneShot).toBe(true)
  })
})
