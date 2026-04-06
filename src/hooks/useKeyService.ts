import {useEffect} from 'react'
import {useMemoizedFn} from 'ahooks/es'
import {useAppDispatch, useAppSelector} from './redux'
import useSubtitle from './useSubtitle'
import {setInputting, setShadowCurIdx, setShadowLoopCount, setShadowModeType, setTempData, setShadowSpecialMode} from '../redux/envReducer'
import {SHADOW_MODE_LOOP_MIN, SHADOW_MODE_LOOP_MAX} from '../consts/const'
import {useMessage} from './useMessageService'

const useKeyService = () => {
  const dispatch = useAppDispatch()
  const inputting = useAppSelector(state => state.env.inputting)
  const curIdx = useAppSelector(state => state.env.curIdx)
  const data = useAppSelector(state => state.env.data)
  const shadowMode = useAppSelector(state => state.env.shadowMode)
  const shadowCurIdx = useAppSelector(state => state.env.shadowCurIdx)
  const shadowLoopCount = useAppSelector(state => state.env.shadowLoopCount)
  const shadowModeType = useAppSelector(state => state.env.shadowModeType)
  const shadowSpecialMode = useAppSelector(state => state.env.shadowSpecialMode)
  const envData = useAppSelector(state => state.env.envData)
  const {sendInject} = useMessage(!!envData.sidePanel)
  const {move} = useSubtitle()

  // 输入中
  useEffect(() => {
    const onInputtingStart = (e: CompositionEvent) => {
      dispatch(setInputting(true))
    }
    const onInputtingEnd = (e: CompositionEvent) => {
      dispatch(setInputting(false))
    }

    document.addEventListener('compositionstart', onInputtingStart)
    document.addEventListener('compositionend', onInputtingEnd)
    return () => {
      document.removeEventListener('compositionstart', onInputtingStart)
      document.removeEventListener('compositionend', onInputtingEnd)
    }
  }, [dispatch])

  const onKeyDown = useMemoizedFn((e: KeyboardEvent) => {
    // 当前在输入中（如中文输入法）
    if (inputting) {
      return
    }

    // 有按其他控制键时，不触发
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      return
    }

    let cursorInInput = false
    if (document.activeElement != null) {
      const tagName = document.activeElement.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        cursorInInput = true
      }
    }
    let prevent = false

    // ========== 影子跟练模式快捷键 ==========
    if (shadowMode && !cursorInInput) {
      const bodyCount = data?.body.length ?? 0

      // 退出特殊模式：左键、右键本身不触发退出（它们是启动特殊模式的键）
      const isArrowLeft = e.key === 'ArrowLeft'
      const isArrowRight = e.key === 'ArrowRight'
      const shouldExitSpecialMode = shadowSpecialMode !== 'none' && !isArrowLeft && !isArrowRight

      // 退出特殊模式的统一处理
      if (shouldExitSpecialMode) {
        dispatch(setShadowSpecialMode('none'))
        sendInject(null, 'SHADOW_LOOP', { enabled: false, startTime: 0, endTime: 0, loopCount: 0 })
      }

      // ← 左键：启动当前句无限循环
      if (isArrowLeft) {
        if (shadowCurIdx !== null && shadowCurIdx >= 0) {
          prevent = true
          const item = data!.body[shadowCurIdx]
          const nextItem = data!.body[shadowCurIdx + 1]
          move(item.from, false)
          dispatch(setShadowLoopCount(-1))
          dispatch(setShadowSpecialMode('infinite'))
          sendInject(null, 'SHADOW_LOOP', {
            enabled: true,
            startTime: item.from,
            endTime: nextItem ? nextItem.from : item.to,
            loopCount: -1,
            mode: 'loop',
            userBuffer: envData.shadowUserBuffer ?? 4,
          })
        }
      }

      // → 右键：启动当前句播完暂停（one-shot echo）
      if (isArrowRight) {
        if (shadowCurIdx !== null && shadowCurIdx >= 0) {
          prevent = true
          const item = data!.body[shadowCurIdx]
          const nextItem = data!.body[shadowCurIdx + 1]
          move(item.from, false)
          dispatch(setShadowLoopCount(1))
          dispatch(setShadowModeType('echo'))
          dispatch(setShadowSpecialMode('oneShot'))
          sendInject(null, 'SHADOW_LOOP', {
            enabled: true,
            startTime: item.from,
            endTime: nextItem ? nextItem.from : item.to,
            loopCount: 1,
            mode: 'echo',
            userBuffer: envData.shadowUserBuffer ?? 4,
          })
        }
      }

      // ↑ 上一句
      if (e.key === 'ArrowUp') {
        if (shadowCurIdx !== null && shadowCurIdx > 0) {
          prevent = true
          const newIdx = shadowCurIdx - 1
          dispatch(setShadowCurIdx(newIdx))
          if (data) {
            const item = data.body[newIdx]
            const nextItem = data.body[newIdx + 1]
            move(item.from, false)
            sendInject(null, 'SHADOW_LOOP', {
              enabled: true,
              startTime: item.from,
              endTime: nextItem ? nextItem.from : item.to,
              loopCount: shadowLoopCount,
              mode: shadowModeType || 'loop',
              userBuffer: envData.shadowUserBuffer ?? 4,
            })
          }
        }
      }

      // ↓ 下一句
      if (e.key === 'ArrowDown') {
        if (shadowCurIdx !== null && shadowCurIdx < bodyCount - 1) {
          prevent = true
          const newIdx = shadowCurIdx + 1
          dispatch(setShadowCurIdx(newIdx))
          if (data) {
            const item = data.body[newIdx]
            const nextItem = data.body[newIdx + 1]
            move(item.from, false)
            sendInject(null, 'SHADOW_LOOP', {
              enabled: true,
              startTime: item.from,
              endTime: nextItem ? nextItem.from : item.to,
              loopCount: shadowLoopCount,
              mode: shadowModeType || 'loop',
              userBuffer: envData.shadowUserBuffer ?? 4,
            })
          }
        }
      }

      // W 增加循环次数（仅在特殊子模式下生效）
      if ((e.key === 'w' || e.key === 'W') && shadowSpecialMode !== 'none') {
        prevent = true
        const current = shadowLoopCount === -1 ? SHADOW_MODE_LOOP_MAX : shadowLoopCount
        const newCount = Math.min(current + 1, SHADOW_MODE_LOOP_MAX)
        const finalCount = newCount === SHADOW_MODE_LOOP_MAX ? -1 : newCount
        dispatch(setShadowLoopCount(finalCount))
        if (shadowCurIdx !== null && data) {
          const item = data.body[shadowCurIdx]
          const nextItem = data.body[shadowCurIdx + 1]
          sendInject(null, 'SHADOW_LOOP', {
            enabled: true,
            startTime: item.from,
            endTime: nextItem ? nextItem.from : item.to,
            loopCount: finalCount,
            mode: shadowModeType || 'loop',
            userBuffer: envData.shadowUserBuffer ?? 4,
          })
        }
      }

      // S 减少循环次数（仅在特殊子模式下生效）
      if ((e.key === 's' || e.key === 'S') && shadowSpecialMode !== 'none') {
        prevent = true
        const current = shadowLoopCount === -1 ? SHADOW_MODE_LOOP_MAX : shadowLoopCount
        const newCount = Math.max(current - 1, SHADOW_MODE_LOOP_MIN)
        dispatch(setShadowLoopCount(newCount))
        if (shadowCurIdx !== null && data) {
          const item = data.body[shadowCurIdx]
          const nextItem = data.body[shadowCurIdx + 1]
          sendInject(null, 'SHADOW_LOOP', {
            enabled: true,
            startTime: item.from,
            endTime: nextItem ? nextItem.from : item.to,
            loopCount: newCount,
            mode: shadowModeType || 'loop',
            userBuffer: envData.shadowUserBuffer ?? 4,
          })
        }
      }

      // Esc：只取消当前特殊子模式，不退出跟练
      if (e.key === 'Escape' && shadowSpecialMode !== 'none') {
        prevent = true
        dispatch(setShadowSpecialMode('none'))
        sendInject(null, 'SHADOW_LOOP', { enabled: false, startTime: 0, endTime: 0, loopCount: 0 })
      }

      // ? 显示帮助（仅在跟练模式下生效）
      if (e.key === '?' && shadowMode) {
        prevent = true
        dispatch(setTempData({shadowShowHelp: true}))
      }
    }

    // ========== 原有快捷键（方向键） ==========
    // ArrowUp/ArrowDown 在跟练模式下被占用（↑上一句，↓下一句），非跟练模式下正常使用
    // ArrowUp - 非跟练模式
    if (!shadowMode && e.key === 'ArrowUp') {
      if (curIdx && (data != null) && !cursorInInput) {
        prevent = true
        const newCurIdx = Math.max(curIdx - 1, 0)
        move(data.body[newCurIdx].from, false)
      }
    }
    // ArrowDown - 非跟练模式
    if (!shadowMode && e.key === 'ArrowDown') {
      if (curIdx !== undefined && (data != null) && !cursorInInput) {
        prevent = true
        const newCurIdx = Math.min(curIdx + 1, data.body.length - 1)
        move(data.body[newCurIdx].from, false)
      }
    }

    // 阻止默认事件
    if (prevent) {
      e.preventDefault()
      e.stopPropagation()
    }
  })

  // 检测快捷键
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])
}

export default useKeyService
