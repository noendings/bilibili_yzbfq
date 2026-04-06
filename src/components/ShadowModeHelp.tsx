import {useEffect} from 'react'
import {useAppDispatch, useAppSelector} from '../hooks/redux'
import {setTempData} from '../redux/envReducer'
import {SHADOW_HELP_AUTO_HIDE} from '../consts/const'
import {MdClose} from 'react-icons/md'
import classNames from 'classnames'

const ShadowModeHelp = () => {
  const dispatch = useAppDispatch()
  const shadowMode = useAppSelector(state => state.env.shadowMode)
  const shadowShowHelp = useAppSelector(state => state.env.tempData.shadowShowHelp)
  const shadowStartTime = useAppSelector(state => state.env.shadowStartTime)

  const show = shadowMode && (shadowShowHelp || (shadowStartTime && Date.now() - shadowStartTime < SHADOW_HELP_AUTO_HIDE))

  useEffect(() => {
    if (shadowMode && shadowStartTime) {
      // 首次开启，自动隐藏
      const timer = setTimeout(() => {
        dispatch(setTempData({shadowShowHelp: false}))
      }, SHADOW_HELP_AUTO_HIDE)
      return () => clearTimeout(timer)
    }
  }, [shadowMode, shadowStartTime, dispatch])

  const onClose = () => {
    dispatch(setTempData({shadowShowHelp: false}))
  }

  if (!show) return null

  return (
    <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-base-100 border-2 border-primary rounded-lg shadow-xl p-4 max-w-md'>
      <div className='flex justify-between items-center mb-3'>
        <h3 className='font-bold text-lg text-primary'>影子跟练 - 快捷键说明</h3>
        <button onClick={onClose} className='btn btn-ghost btn-sm btn-circle'>
          <MdClose />
        </button>
      </div>

      <div className='text-xs text-center mb-3 p-2 bg-primary/10 rounded'>
        ←无限循环：当前句反复播放<br/>
        →播完暂停：视频播放当前句后暂停，可自己跟读<br/>
        其他任意键退出当前模式
      </div>

      <div className='space-y-2 text-sm'>
        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>←</kbd>
          <span>当前句无限循环</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>→</kbd>
          <span>当前句播完暂停</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>↑</kbd>
          <span>上一句（退出特殊模式）</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>↓</kbd>
          <span>下一句（退出特殊模式）</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>W</kbd>
          <span>增加循环次数</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>S</kbd>
          <span>减少循环次数</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>M</kbd>
          <span>迷你模式</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>Esc</kbd>
          <span>退出跟练模式</span>
        </div>

        <div className='flex items-center gap-3'>
          <kbd className='kbd kbd-sm bg-base-300'>?</kbd>
          <span>显示此帮助</span>
        </div>
      </div>

      <div className='mt-4 pt-3 border-t border-base-300 text-xs text-center desc'>
        按 <kbd className='kbd kbd-xs'>Esc</kbd> 或点击关闭
      </div>
    </div>
  )
}

export default ShadowModeHelp
