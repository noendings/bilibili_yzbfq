import React, {useCallback, useMemo, useEffect} from 'react'
import 'tippy.js/dist/tippy.css'
import {useAppDispatch, useAppSelector} from './hooks/redux'
import {setEnvData, setEnvReady, setTempData, setTempReady, setMaskSettings} from './redux/envReducer'
import {cloneDeep} from 'lodash-es'
import {STORAGE_ENV, STORAGE_TEMP, MASK_STORAGE_KEY, MASK_DEFAULT_WIDTH, MASK_DEFAULT_HEIGHT, MASK_DEFAULT_TOP, MASK_DEFAULT_LEFT} from './consts/const'
import OptionsPage from './pages/OptionsPage'
import {handleJson} from './utils/util'
import {Toaster} from 'react-hot-toast'
import useMessageService from './hooks/useMessageService'
import MainPage from './pages/MainPage'
import useLocalStorage from './hooks/useLocalStorage'

function App() {
  const dispatch = useAppDispatch()
  const envData = useAppSelector(state => state.env.envData)
  const tempData = useAppSelector(state => state.env.tempData)
  const path = useAppSelector(state => state.env.path)
  const envReady = useAppSelector(state => state.env.envReady)
  const tempReady = useAppSelector(state => state.env.tempReady)

  // env数据
  const savedEnvData = useMemo(() => {
    return handleJson(cloneDeep(envData)) as EnvData
  }, [envData])
  const onLoadEnv = useCallback((data?: EnvData) => {
    if (data != null) {
      dispatch(setEnvData(data))
    }
    dispatch(setEnvReady())
  }, [dispatch])
  useLocalStorage<EnvData>('chrome_client', STORAGE_ENV, savedEnvData, onLoadEnv)

  // temp数据
  const savedTempData = useMemo(() => {
    return handleJson(cloneDeep(tempData)) as TempData
  }, [tempData])
  const onLoadTemp = useCallback((data?: TempData) => {
    if (data != null) {
      dispatch(setTempData(data))
    }
    dispatch(setTempReady())
  }, [dispatch])
  useLocalStorage<TempData>('chrome_client', STORAGE_TEMP, savedTempData, onLoadTemp)

  // 加载遮罩设置
  useEffect(() => {
    if (tempReady) {
      const loadMaskSettings = async () => {
        try {
          const result = await chrome.storage.sync.get(MASK_STORAGE_KEY)
          if (result[MASK_STORAGE_KEY]) {
            const saved = JSON.parse(result[MASK_STORAGE_KEY])
            dispatch(setMaskSettings({
              width: saved.width ?? MASK_DEFAULT_WIDTH,
              height: saved.height ?? MASK_DEFAULT_HEIGHT,
              top: saved.top ?? MASK_DEFAULT_TOP,
              left: saved.left ?? MASK_DEFAULT_LEFT,
              hasBeenSet: saved.hasBeenSet ?? false,
            }))
          }
        } catch (e) {
          console.error('加载遮罩设置失败:', e)
        }
      }
      loadMaskSettings()
    }
  }, [tempReady, dispatch])

  // services
  useMessageService()

  return <div>
    <Toaster position={path === 'app'?'bottom-center':'top-center'}/>
    {path === 'app' && <MainPage/>}
    {path === 'options' && envReady && tempReady && <OptionsPage/>}
  </div>
}

export default App
