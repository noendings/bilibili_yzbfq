import React, {useCallback, useEffect, useMemo, useRef} from 'react'
import {useAppDispatch, useAppSelector} from '../hooks/redux'
import useSubtitle from '../hooks/useSubtitle'
import {setCheckAutoScroll, setCurOffsetTop, setNeedScroll, setShadowCurIdx, setShadowModeType} from '../redux/envReducer'
import NormalSegmentItem from './NormalSegmentItem'
import CompactSegmentItem from './CompactSegmentItem'
import {useMessage} from '../hooks/useMessageService'

const SegmentItem = (props: {
  bodyRef: any
  item: TranscriptItem
  idx: number
  isIn: boolean
  needScroll?: boolean
  last: boolean
}) => {
  const {bodyRef, item, idx, isIn, needScroll, last} = props
  const dispatch = useAppDispatch()
  const ref = useRef<any>()
  const {move} = useSubtitle()
  const envData = useAppSelector(state => state.env.envData)
  const shadowMode = useAppSelector(state => state.env.shadowMode)
  const shadowModeType = useAppSelector(state => state.env.shadowModeType)
  const shadowLoopCount = useAppSelector(state => state.env.shadowLoopCount)
  const {sendInject} = useMessage(!!envData.sidePanel)

  const compact = useAppSelector(state => state.env.tempData.compact)
  const searchText = useAppSelector(state => state.env.searchText)
  const searchResult = useAppSelector(state => state.env.searchResult)
  const display = useMemo(() => {
    if (searchText) {
      return searchResult[item.idx+''] ? 'inline' : 'none'
    } else {
      return 'inline'
    }
  }, [item.idx, searchResult, searchText])

  const data = useAppSelector(state => state.env.data)

  const moveCallback = useCallback((event: any) => {
    if (event.altKey) { // 复制
      navigator.clipboard.writeText(item.content).catch(console.error)
    } else {
      // 跳转到该字幕
      move(item.from, false)

      // 如果在跟练模式下，同时更新循环位置
      if (shadowMode) {
        dispatch(setShadowCurIdx(idx))
        dispatch(setShadowModeType(shadowModeType))
        const nextItem = data?.body[idx + 1]
        sendInject(null, 'SHADOW_LOOP', {
          enabled: true,
          startTime: item.from,
          endTime: nextItem ? nextItem.from : item.to,
          loopCount: shadowLoopCount,
          mode: shadowModeType,
          userBuffer: envData.shadowUserBuffer ?? 4,
        })
      }
    }
  }, [item.content, item.from, item.to, move, shadowMode, idx, data, dispatch, sendInject, shadowLoopCount, shadowModeType, envData.shadowUserBuffer])

  const move2Callback = useCallback((event: any) => {
    if (event.altKey) { // 复制
      navigator.clipboard.writeText(item.content).catch(console.error)
    } else {
      move(item.from, true)
    }
  }, [item.content, item.from, move])

  // 检测需要滚动进入视野
  useEffect(() => {
    if (needScroll) {
      bodyRef.current.scrollTop = ref.current.offsetTop - bodyRef.current.offsetTop - 40
      dispatch(setNeedScroll(false))
    }
  }, [dispatch, needScroll, bodyRef])

  // 进入时更新当前offsetTop
  useEffect(() => {
    if (isIn) {
      dispatch(setCurOffsetTop(ref.current.offsetTop))
      dispatch(setCheckAutoScroll(true))
    }
  }, [dispatch, isIn])

  return <span ref={ref} style={{
    display
  }}>
    {compact
      ? <CompactSegmentItem
        item={item}
        idx={idx}
        isIn={isIn}
        last={last}
        moveCallback={moveCallback}
        move2Callback={move2Callback}
      />
      :
      <NormalSegmentItem
        item={item}
        idx={idx}
        isIn={isIn}
        moveCallback={moveCallback}
        move2Callback={move2Callback}
      />
    }
  </span>
}

export default SegmentItem
