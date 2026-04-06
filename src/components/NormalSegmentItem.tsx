import React, {useMemo} from 'react'
import {formatTime} from '../utils/util'
import {useAppSelector} from '../hooks/redux'
import {getDisplay, getTransText} from '../utils/bizUtil'
import classNames from 'classnames'

const NormalSegmentItem = (props: {
  item: TranscriptItem
  idx: number
  isIn: boolean
  moveCallback: (event: any) => void
  move2Callback: (event: any) => void
}) => {
  const {item, idx, isIn, moveCallback, move2Callback} = props
  const transResult = useAppSelector(state => state.env.transResults[idx])
  const envData = useAppSelector(state => state.env.envData)
  const fontSize = useAppSelector(state => state.env.envData.fontSize)
  const autoTranslate = useAppSelector(state => state.env.autoTranslate)
  const shadowMode = useAppSelector(state => state.env.shadowMode)
  const shadowCurIdx = useAppSelector(state => state.env.shadowCurIdx)
  const transText = useMemo(() => getTransText(transResult, envData.hideOnDisableAutoTranslate, autoTranslate), [autoTranslate, envData.hideOnDisableAutoTranslate, transResult])
  const display = useMemo(() => getDisplay(envData.transDisplay, item.content, transText), [envData.transDisplay, item.content, transText])

  const isShadowCurrent = shadowMode && shadowCurIdx === idx

  return <div className={classNames('flex py-0.5 cursor-pointer rounded-sm hover:bg-base-200', fontSize === 'large'?'text-sm':'text-xs',
    isShadowCurrent && 'bg-primary/20 border-l-2 border-primary pl-1')}
              onClick={moveCallback} onDoubleClick={move2Callback}>
    <div className='desc w-[66px] flex justify-center'>{formatTime(item.from)}</div>
    <div className={'flex-1'}>
      <div className={classNames('font-medium', isIn ? 'text-primary underline' : '', isShadowCurrent && 'text-primary')}>{display.main}</div>
      {display.sub && <div className='desc'>{display.sub}</div>}
    </div>
  </div>
}

export default NormalSegmentItem