import {IoIosArrowUp} from 'react-icons/io'
import {useCallback, useMemo} from 'react'
import {useAppDispatch, useAppSelector} from '../hooks/redux'
import {find, remove} from 'lodash-es'
import {
  setCurFetched,
  setCurInfo,
  setData,
  setInfos,
  setUploadedTranscript,
  setShadowMode,
  setShadowCurIdx,
  setMaskSettingsVisible,
  setTempData,
  setMaskSettings,
} from '../redux/envReducer'
import MoreBtn from './MoreBtn'
import classNames from 'classnames'
import {parseTranscript} from '../utils/bizUtil'
import {useMessage} from '@/hooks/useMessageService'
import {MASK_DEFAULT_HEIGHT, MASK_DEFAULT_LEFT, MASK_DEFAULT_TOP, MASK_DEFAULT_WIDTH} from '@/consts/const'
import {MdVisibility, MdVisibilityOff, MdSettings} from 'react-icons/md'

const Header = (props: {
  foldCallback: () => void
}) => {
  const {foldCallback} = props
  const dispatch = useAppDispatch()
  const infos = useAppSelector(state => state.env.infos)
  const curInfo = useAppSelector(state => state.env.curInfo)
  const fold = useAppSelector(state => state.env.fold)
  const uploadedTranscript = useAppSelector(state => state.env.uploadedTranscript)
  const envData = useAppSelector(state => state.env.envData)
  const shadowMode = useAppSelector(state => state.env.shadowMode)
  const shadowLoopCount = useAppSelector(state => state.env.shadowLoopCount)
  const data = useAppSelector(state => state.env.data)
  const curIdx = useAppSelector(state => state.env.curIdx)
  const maskSettings = useAppSelector(state => state.env.maskSettings)
  const {sendInject} = useMessage(!!envData.sidePanel)

  // 遮罩功能 - 显示遮罩
  const onShowMask = useCallback(async (e: any) => {
    e.stopPropagation()
    // 检查是否设置过
    if (!maskSettings.hasBeenSet) {
      // 首次使用，打开设置界面
      dispatch(setMaskSettingsVisible(true))
      dispatch(setTempData({ maskVisible: false }))
    } else {
      // 已设置过，直接显示
      dispatch(setTempData({ maskVisible: true }))
      await sendInject(null, 'MASK', {
        visible: true,
        settings: maskSettings,
      })
    }
  }, [dispatch, maskSettings, sendInject])

  // 遮罩功能 - 隐藏遮罩
  const onHideMask = useCallback(async (e: any) => {
    e.stopPropagation()
    dispatch(setTempData({ maskVisible: false }))
    await sendInject(null, 'MASK', {
      visible: false,
    })
  }, [dispatch, sendInject])

  // 遮罩功能 - 打开设置
  const onOpenMaskSettings = useCallback(async (e: any) => {
    e.stopPropagation()
    // 先显示遮罩
    dispatch(setTempData({ maskVisible: true }))
    await sendInject(null, 'MASK', {
      visible: true,
      settings: maskSettings,
    })
    // 打开设置界面
    dispatch(setMaskSettingsVisible(true))
  }, [dispatch, maskSettings, sendInject])

  const upload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.vtt,.srt'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (text) {
          const infos_ = [...(infos??[])]
          // const blob = new Blob([text], {type: 'text/plain'})
          // const url = URL.createObjectURL(blob)
          // remove old if exist
          remove(infos_, {id: 'uploaded'})
          // add new
          const tarInfo = {id: 'uploaded', subtitle_url: 'uploaded', lan_doc: '上传的字幕'}
          infos_.push(tarInfo)
          // set
          const transcript = parseTranscript(file.name, text)
          dispatch(setInfos(infos_))
          dispatch(setCurInfo(tarInfo))
          dispatch(setCurFetched(true))
          dispatch(setUploadedTranscript(transcript))
          dispatch(setData(transcript))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [dispatch, infos])

  const selectCallback = useCallback((e: any) => {
    if (e.target.value === 'upload') {
      upload()
      return
    }

    const tarInfo = find(infos, {subtitle_url: e.target.value})
    if (curInfo?.id !== tarInfo?.id) {
      dispatch(setCurInfo(tarInfo))
      if (tarInfo && tarInfo.subtitle_url === 'uploaded') {
        dispatch(setCurFetched(true))
        dispatch(setData(uploadedTranscript))
      } else {
        dispatch(setCurFetched(false))
      }
    }
  }, [curInfo?.id, dispatch, infos, upload, uploadedTranscript])

  const preventCallback = useCallback((e: any) => {
    e.stopPropagation()
  }, [])

  const onUpload = useCallback((e: any) => {
    e.stopPropagation()
    upload()
  }, [upload])

  // 影子跟练模式切换（唯一入口，不再区分循环/跟读子按钮）
  const onShadowModeToggle = useCallback((e: any) => {
    e.stopPropagation()
    const newMode = !shadowMode
    dispatch(setShadowMode(newMode))
    if (newMode && data && curIdx !== undefined) {
      dispatch(setShadowCurIdx(curIdx))
      const item = data.body[curIdx]
      const nextItem = data.body[curIdx + 1]
      if (item) {
        sendInject(null, 'SHADOW_LOOP', {
          enabled: true,
          startTime: item.from,
          endTime: nextItem ? nextItem.from : item.to,
          loopCount: shadowLoopCount,
          mode: 'loop',
          userBuffer: envData.shadowUserBuffer ?? 4,
        })
      }
    } else if (!newMode) {
      sendInject(null, 'SHADOW_EXIT', {})
    }
  }, [shadowMode, dispatch, data, curIdx, shadowLoopCount, sendInject, envData.shadowUserBuffer])


  // 呼吸灯效果
  const breathClass = useMemo(() => {
    if (!shadowMode) return ''
    return 'animate-pulse'
  }, [shadowMode])

  return <div className={classNames('rounded-[6px] bg-[#f1f2f3] dark:bg-base-100 h-[44px] flex justify-between items-center cursor-pointer',
    shadowMode && 'border-2 border-primary shadow-lg shadow-primary/30')} onClick={() => {
    if (!envData.sidePanel) {
      foldCallback()
    }
  }}>
    <div className='shrink-0 flex items-center'>
      {/* <img src="bibijun.png" alt="Logo" className="w-auto h-6 ml-2 mr-1" /> */}
      <span className='shrink-0 text-[15px] font-medium pl-[16px] pr-[14px]'>
        {shadowMode && <span className='text-primary mr-1'>🎵</span>}
        字幕列表
      </span>
      <MoreBtn placement={'right-start'}/>
    </div>
    <div className='flex gap-0.5 items-center mr-[16px]'>
      {/* 遮罩功能按钮 */}
      <div className='dropdown dropdown-end'>
        <label tabIndex={0} className='btn btn-xs btn-ghost mr-1'>
          🖼️ 遮罩
        </label>
        <ul tabIndex={0} className='dropdown-content z-[100] menu p-2 shadow bg-base-100 rounded-box w-40'>
          <li>
            <a onClick={onShowMask} className='flex items-center gap-2'>
              <MdVisibility className='text-primary' />
              显示遮罩
            </a>
          </li>
          <li>
            <a onClick={onHideMask} className='flex items-center gap-2'>
              <MdVisibilityOff className='text-gray-500' />
              隐藏遮罩
            </a>
          </li>
          <li>
            <a onClick={onOpenMaskSettings} className='flex items-center gap-2'>
              <MdSettings className='text-info' />
              设置遮罩
            </a>
          </li>
        </ul>
      </div>

      {/* 快捷键提示区 */}
      <div className='dropdown dropdown-end'>
        <label tabIndex={0} className={classNames('btn btn-xs mr-1', shadowMode ? 'btn-ghost text-primary' : 'btn-ghost text-gray-400')} title='快捷键'>
          <span className='text-[11px]'>←→</span>
        </label>
        <ul tabIndex={0} className='dropdown-content z-[100] menu p-2 shadow bg-base-100 rounded-box w-52'>
          <li className='menu-title px-2 py-1 text-xs text-primary font-bold'>影子跟练 · 快捷键</li>
          <li><a className='flex items-center gap-3'><kbd className='kbd kbd-sm'>←</kbd><span>当前句无限循环</span></a></li>
          <li><a className='flex items-center gap-3'><kbd className='kbd kbd-sm'>→</kbd><span>当前句播完暂停</span></a></li>
          <li><a className='flex items-center gap-3'><kbd className='kbd kbd-sm'>↑</kbd><span>上一句（退出特殊模式）</span></a></li>
          <li><a className='flex items-center gap-3'><kbd className='kbd kbd-sm'>↓</kbd><span>下一句（退出特殊模式）</span></a></li>
          <li><a className='flex items-center gap-3'><kbd className='kbd kbd-sm'>Esc</kbd><span>取消特殊模式</span></a></li>
        </ul>
      </div>
      {shadowMode && (
        <div className='text-xs desc mr-1'>
          <span>←无限循环</span>
          <span className='mx-0.5'>|</span>
          <span>→播完暂停</span>
        </div>
      )}
      {(infos == null) || infos.length <= 0
        ?<div className='text-xs desc'>
          <button className='btn btn-xs btn-link' onClick={onUpload}>上传(vtt/srt)</button>
          (未找到字幕)
      </div>
        :<select disabled={!infos || infos.length <= 0} className='select select-ghost select-xs line-clamp-1' value={curInfo?.subtitle_url} onChange={selectCallback} onClick={preventCallback}>
          {infos?.map((item: any) => <option key={item.id} value={item.subtitle_url}>{item.lan_doc}</option>)}
          <option key='upload' value='upload'>上传(vtt/srt)</option>
        </select>}
      {!envData.sidePanel && <IoIosArrowUp className={classNames('shrink-0 desc transform ease-in duration-300', fold?'rotate-180':'')}/>}
    </div>
  </div>
}

export default Header
