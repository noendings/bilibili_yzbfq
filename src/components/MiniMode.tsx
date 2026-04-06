import {useCallback} from 'react'
import {useAppDispatch, useAppSelector} from '../hooks/redux'
import {setTempData, setShadowMode} from '../redux/envReducer'
import {formatTime} from '../utils/util'
import {MdClose, MdExpand} from 'react-icons/md'

const MiniMode = () => {
  const dispatch = useAppDispatch()
  const shadowMode = useAppSelector(state => state.env.shadowMode)
  const shadowCurIdx = useAppSelector(state => state.env.shadowCurIdx)
  const shadowLoopCount = useAppSelector(state => state.env.shadowLoopCount)
  const data = useAppSelector(state => state.env.data)
  const shadowMiniMode = useAppSelector(state => state.env.tempData.shadowMiniMode)

  const show = shadowMode && shadowMiniMode

  const onExpand = useCallback(() => {
    dispatch(setTempData({shadowMiniMode: false}))
  }, [dispatch])

  const onExit = useCallback(() => {
    dispatch(setShadowMode(false))
    dispatch(setTempData({shadowMiniMode: false}))
  }, [dispatch])

  if (!show) return null

  const currentItem = data?.body[shadowCurIdx ?? 0]
  const loopText = shadowLoopCount === -1 ? '∞' : shadowLoopCount.toString()

  return (
    <div className='fixed bottom-4 right-4 z-[9998] bg-base-100/90 backdrop-blur-sm border-2 border-primary rounded-lg shadow-xl p-3 max-w-md'>
      <div className='flex justify-between items-center mb-2'>
        <span className='text-sm font-medium text-primary'>🎵 迷你模式</span>
        <div className='flex gap-1'>
          <button onClick={onExpand} className='btn btn-ghost btn-xs' title='展开'>
            <MdExpand />
          </button>
          <button onClick={onExit} className='btn btn-ghost btn-xs' title='退出'>
            <MdClose />
          </button>
        </div>
      </div>

      <div className='text-sm'>
        {currentItem ? (
          <>
            <div className='mb-2 text-base font-medium'>{currentItem.content}</div>
            <div className='flex items-center gap-3 text-xs desc'>
              <span>📝 {formatTime(currentItem.from)}</span>
              <span>🔁 循环 {loopText} 次</span>
            </div>
          </>
        ) : (
          <div className='text-desc'>暂无字幕</div>
        )}
      </div>

      <div className='mt-2 pt-2 border-t border-base-300 text-xs desc text-center'>
        按 <kbd className='kbd kbd-xs'>M</kbd> 或悬停展开完整面板
      </div>
    </div>
  )
}

export default MiniMode
