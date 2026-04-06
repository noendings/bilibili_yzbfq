import { useCallback, useEffect, useState, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { setMaskSettings, setMaskSettingsVisible, setTempData } from '../redux/envReducer'
import { MASK_STEP } from '../consts/const'
import { useMessage } from '../hooks/useMessageService'
import toast from 'react-hot-toast'

interface Props {
  onClose?: () => void
}

const MaskSettings = (props: Props) => {
  const { onClose } = props
  const dispatch = useAppDispatch()
  const envData = useAppSelector(state => state.env.envData)
  const maskSettings = useAppSelector(state => state.env.maskSettings)
  const maskSettingsVisible = useAppSelector(state => state.env.tempData.maskSettingsVisible)
  const { sendInject } = useMessage(!!envData.sidePanel)

  const [localSettings, setLocalSettings] = useState(maskSettings)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 同步全局设置到本地
  useEffect(() => {
    setLocalSettings(maskSettings)
  }, [maskSettings])

  // 实时预览 - 发送更新到 inject
  useEffect(() => {
    if (maskSettingsVisible) {
      sendInject(null, 'UPDATE_MASK_SETTINGS', localSettings)
    }
  }, [localSettings, maskSettingsVisible, sendInject])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const updateSetting = useCallback((key: keyof typeof localSettings, delta: number) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: Math.max(10, (prev[key] as number) + delta) // 最小10px
    }))
  }, [])

  // 开始长按移动
  const startMove = useCallback((key: keyof typeof localSettings, delta: number) => {
    // 先执行一次
    updateSetting(key, delta)
    // 清理之前的定时器
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    // 延迟后开始持续移动
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        updateSetting(key, delta)
      }, 80)
    }, 400)
  }, [updateSetting])

  // 停止移动
  const stopMove = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleSave = useCallback(async () => {
    // 保存设置
    dispatch(setMaskSettings(localSettings))
    await sendInject(null, 'UPDATE_MASK_SETTINGS', localSettings)
    toast.success('遮罩设置已保存')
    dispatch(setMaskSettingsVisible(false))
    onClose?.()
  }, [dispatch, localSettings, sendInject, onClose])

  const handleCancel = useCallback(() => {
    // 取消，恢复原设置
    sendInject(null, 'UPDATE_MASK_SETTINGS', maskSettings)
    dispatch(setMaskSettingsVisible(false))
    onClose?.()
  }, [dispatch, maskSettings, sendInject, onClose])

  if (!maskSettingsVisible) return null

  return (
    <div className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/50'>
      <div className='bg-base-100 rounded-lg shadow-xl p-6 w-[400px] max-w-[90vw]'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-semibold'>遮罩设置</h3>
          <button className='btn btn-ghost btn-sm btn-circle' onClick={handleCancel}>✕</button>
        </div>

        <div className='space-y-4'>
          {/* 位置调整 */}
          <div>
            <div className='text-sm font-medium mb-2'>位置调整 (长按持续移动)</div>
            <div className='flex flex-wrap gap-2'>
              <button
                className='btn btn-sm btn-outline'
                onMouseDown={() => startMove('top', -MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('top', -MASK_STEP)}
                onTouchEnd={stopMove}
                title='向上移动'
              >
                ↑
              </button>
              <button
                className='btn btn-sm btn-outline'
                onMouseDown={() => startMove('top', MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('top', MASK_STEP)}
                onTouchEnd={stopMove}
                title='向下移动'
              >
                ↓
              </button>
              <button
                className='btn btn-sm btn-outline'
                onMouseDown={() => startMove('left', -MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('left', -MASK_STEP)}
                onTouchEnd={stopMove}
                title='向左移动'
              >
                ←
              </button>
              <button
                className='btn btn-sm btn-outline'
                onMouseDown={() => startMove('left', MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('left', MASK_STEP)}
                onTouchEnd={stopMove}
                title='向右移动'
              >
                →
              </button>
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              当前: 左 {localSettings.left}px, 上 {localSettings.top}px
            </div>
          </div>

          {/* 高度调整 */}
          <div>
            <div className='text-sm font-medium mb-2'>高度调整 (长按持续调整)</div>
            <div className='flex gap-2'>
              <button
                className='btn btn-sm btn-outline flex-1'
                onMouseDown={() => startMove('height', -MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('height', -MASK_STEP)}
                onTouchEnd={stopMove}
              >
                缩短
              </button>
              <button
                className='btn btn-sm btn-outline flex-1'
                onMouseDown={() => startMove('height', MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('height', MASK_STEP)}
                onTouchEnd={stopMove}
              >
                延长
              </button>
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              当前高度: {localSettings.height}px
            </div>
          </div>

          {/* 宽度调整 */}
          <div>
            <div className='text-sm font-medium mb-2'>宽度调整 (长按持续调整)</div>
            <div className='flex gap-2'>
              <button
                className='btn btn-sm btn-outline flex-1'
                onMouseDown={() => startMove('width', -MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('width', -MASK_STEP)}
                onTouchEnd={stopMove}
              >
                变窄
              </button>
              <button
                className='btn btn-sm btn-outline flex-1'
                onMouseDown={() => startMove('width', MASK_STEP)}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                onTouchStart={() => startMove('width', MASK_STEP)}
                onTouchEnd={stopMove}
              >
                加宽
              </button>
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              当前宽度: {localSettings.width}px
            </div>
          </div>

          {/* 快捷调整 */}
          <div>
            <div className='text-sm font-medium mb-2'>快捷调整</div>
            <div className='grid grid-cols-3 gap-2 text-xs'>
              <button
                className='btn btn-xs btn-ghost'
                onClick={() => {
                  setLocalSettings(prev => ({
                    ...prev,
                    top: prev.top - 50,
                    height: prev.height + 50,
                  }))
                }}
              >
                ↑+延
              </button>
              <button
                className='btn btn-xs btn-ghost'
                onClick={() => {
                  setLocalSettings(prev => ({
                    ...prev,
                    top: prev.top + 50,
                    height: prev.height - 50,
                  }))
                }}
              >
                ↓+缩
              </button>
              <button
                className='btn btn-xs btn-ghost'
                onClick={() => {
                  setLocalSettings(prev => ({
                    ...prev,
                    left: prev.left - 50,
                    width: prev.width + 50,
                  }))
                }}
              >
                ←+宽
              </button>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className='flex justify-end gap-2 mt-6'>
          <button className='btn btn-ghost' onClick={handleCancel}>
            取消
          </button>
          <button className='btn btn-primary' onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default MaskSettings
