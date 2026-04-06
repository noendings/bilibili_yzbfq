import {createSlice, PayloadAction} from '@reduxjs/toolkit'
import {find, findIndex} from 'lodash-es'
import {DEFAULT_SERVER_URL_OPENAI, MASK_DEFAULT_HEIGHT, MASK_DEFAULT_LEFT, MASK_DEFAULT_TOP, MASK_DEFAULT_WIDTH, TOTAL_HEIGHT_DEF} from '../consts/const'

interface EnvState {
  envData: EnvData
  envReady: boolean

  tempData: TempData
  tempReady: boolean

  path?: 'app' | 'options'

  fold: boolean // fold app
  foldAll?: boolean // fold all segments
  autoTranslate?: boolean
  autoScroll?: boolean
  checkAutoScroll?: boolean
  curOffsetTop?: number
  floatKeyPointsSegIdx?: number // segment的startIdx

  noVideo?: boolean
  totalHeight: number
  curIdx?: number // 从0开始
  needScroll?: boolean
  chapters?: Chapter[]
  infos?: any[]
  curInfo?: any
  curFetched?: boolean
  data?: Transcript
  uploadedTranscript?: Transcript
  segments?: Segment[]
  url?: string
  title?: string
  ctime?: number | null
  author?: string
  taskIds?: string[]
  transResults: { [key: number]: TransResult }
  lastTransTime?: number
  lastSummarizeTime?: number

  // ask
  asks: AskInfo[]

  /**
   * 是否输入中（中文）
   */
  inputting: boolean

  searchText: string
  searchResult: Record<string, boolean>

  // 当前视频是否计算过操作
  reviewAction: boolean

  // 影子跟练模式
  shadowMode: boolean                    // 跟练模式开关
  shadowModeType: 'loop' | 'echo'       // 跟练模式类型（保留但不再由按钮设置）
  shadowCurIdx: number | null           // 当前循环的句子索引
  shadowLoopCount: number                // 当前句循环次数 (-1=无限)
  shadowLoopProgress: number            // 已练习句数
  shadowStartTime: number | null         // 跟练开始时间
  shadowSpecialMode: 'none' | 'infinite' | 'oneShot' // 当前特殊模式：none=普通, infinite=左键无限循环, oneShot=右键播完暂停

  // 遮罩功能
  maskSettings: MaskSettings              // 遮罩设置
}

const initialState: EnvState = {
  envData: {
    serverUrl: DEFAULT_SERVER_URL_OPENAI,
    translateEnable: true,
    summarizeEnable: true,
    autoExpand: true,
    theme: 'light',
    searchEnabled: true,
  },
  tempData: {
    curSummaryType: 'overview',
    shadowMiniMode: false,
    shadowShowHelp: false,
  },
  totalHeight: TOTAL_HEIGHT_DEF,
  autoScroll: true,
  envReady: false,
  tempReady: false,
  fold: true,
  transResults: {},

  inputting: false,

  searchText: '',
  searchResult: {},

  asks: [],

  reviewAction: false,

  shadowMode: false,
  shadowModeType: 'loop',
  shadowCurIdx: null,
  shadowLoopCount: -1,
  shadowLoopProgress: 0,
  shadowStartTime: null,
  shadowSpecialMode: 'none',

  // 遮罩功能
  maskSettings: {
    width: MASK_DEFAULT_WIDTH,
    height: MASK_DEFAULT_HEIGHT,
    top: MASK_DEFAULT_TOP,
    left: MASK_DEFAULT_LEFT,
    hasBeenSet: false,
  },
}

export const slice = createSlice({
  name: 'env',
  initialState,
  reducers: {
    setEnvData: (state, action: PayloadAction<EnvData>) => {
      state.envData = {
        ...state.envData,
        ...action.payload,
      }
    },
    setEnvReady: (state) => {
      state.envReady = true
    },
    setTempData: (state, action: PayloadAction<Partial<TempData>>) => {
      state.tempData = {
        ...state.tempData,
        ...action.payload,
      }
    },
    setReviewAction: (state, action: PayloadAction<boolean>) => {
      state.reviewAction = action.payload
    },
    setPath: (state, action: PayloadAction<'app' | 'options' | undefined>) => {
      state.path = action.payload
    },
    setTempReady: (state) => {
      state.tempReady = true
    },
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload
    },
    setSearchResult: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.searchResult = action.payload
    },
    setFloatKeyPointsSegIdx: (state, action: PayloadAction<number | undefined>) => {
      state.floatKeyPointsSegIdx = action.payload
    },
    setFoldAll: (state, action: PayloadAction<boolean>) => {
      state.foldAll = action.payload
    },
    setTotalHeight: (state, action: PayloadAction<number>) => {
      state.totalHeight = action.payload
    },
    setTaskIds: (state, action: PayloadAction<string[]>) => {
      state.taskIds = action.payload
    },
    setLastTransTime: (state, action: PayloadAction<number>) => {
      state.lastTransTime = action.payload
    },
    setLastSummarizeTime: (state, action: PayloadAction<number>) => {
      state.lastSummarizeTime = action.payload
    },
    addTaskId: (state, action: PayloadAction<string>) => {
      state.taskIds = [...(state.taskIds ?? []), action.payload]
    },
    delTaskId: (state, action: PayloadAction<string>) => {
      state.taskIds = state.taskIds?.filter(id => id !== action.payload)
    },
    addTransResults: (state, action: PayloadAction<{ [key: number]: TransResult }>) => {
      // 不要覆盖TransResult里code为200的
      for (const payloadKey in action.payload) {
        const payloadItem = action.payload[payloadKey]
        const stateItem = state.transResults[payloadKey]
        if (!stateItem || stateItem.code !== '200') {
          state.transResults[payloadKey] = payloadItem
        } else if (stateItem.code === '200') { // 保留data
          state.transResults[payloadKey] = {
            ...payloadItem,
            data: stateItem.data,
          }
        }
      }
    },
    setSummaryContent: (state, action: PayloadAction<{
      segmentStartIdx: number
      type: SummaryType
      content?: any
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        let summary = segment.summaries[action.payload.type]
        if (!summary) {
          summary = {
            type: action.payload.type,
            status: 'done',
            content: action.payload.content,
          }
          segment.summaries[action.payload.type] = summary
        } else {
          summary.content = action.payload.content
        }
      }
    },
    setSummaryStatus: (state, action: PayloadAction<{
      segmentStartIdx: number
      type: SummaryType
      status: SummaryStatus
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        let summary = segment.summaries[action.payload.type]
        if (summary) {
          summary.status = action.payload.status
        } else {
          summary = {
            type: action.payload.type,
            status: action.payload.status,
          }
          segment.summaries[action.payload.type] = summary
        }
      }
    },
    setSummaryError: (state, action: PayloadAction<{
      segmentStartIdx: number
      type: SummaryType
      error?: string
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        let summary = segment.summaries[action.payload.type]
        if (summary) {
          summary.error = action.payload.error
        } else {
          summary = {
            type: action.payload.type,
            status: 'done',
            error: action.payload.error,
          }
          segment.summaries[action.payload.type] = summary
        }
      }
    },
    addAskInfo: (state, action: PayloadAction<AskInfo>) => {
      state.asks.push(action.payload)
    },
    delAskInfo: (state, action: PayloadAction<string>) => {
      state.asks = state.asks.filter(ask => ask.id !== action.payload)
    },
    mergeAskInfo: (state, action: PayloadAction<PartialOfAskInfo>) => {
      const idx = findIndex(state.asks, {id: action.payload.id})
      if (idx >= 0) {
        state.asks[idx] = {
          ...state.asks[idx],
          ...action.payload,
        }
      }
    },
    setSegmentFold: (state, action: PayloadAction<{
      segmentStartIdx: number
      fold: boolean
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        segment.fold = action.payload.fold
      }
    },
    clearTransResults: (state) => {
      state.transResults = {}
    },
    setCurIdx: (state, action: PayloadAction<number | undefined>) => {
      state.curIdx = action.payload
    },
    setAutoTranslate: (state, action: PayloadAction<boolean>) => {
      state.autoTranslate = action.payload
    },
    setAutoScroll: (state, action: PayloadAction<boolean>) => {
      state.autoScroll = action.payload
    },
    setCheckAutoScroll: (state, action: PayloadAction<boolean>) => {
      state.checkAutoScroll = action.payload
    },
    setCurOffsetTop: (state, action: PayloadAction<number | undefined>) => {
      state.curOffsetTop = action.payload
    },
    setNoVideo: (state, action: PayloadAction<boolean>) => {
      state.noVideo = action.payload
    },
    setNeedScroll: (state, action: PayloadAction<boolean>) => {
      state.needScroll = action.payload
    },
    setUrl: (state, action: PayloadAction<string | undefined>) => {
      state.url = action.payload
    },
    setTitle: (state, action: PayloadAction<string | undefined>) => {
      state.title = action.payload
    },
    setCtime: (state, action: PayloadAction<number | null | undefined>) => {
      state.ctime = action.payload
    },
    setAuthor: (state, action: PayloadAction<string | undefined>) => {
      state.author = action.payload
    },
    setChapters: (state, action: PayloadAction<Chapter[]>) => {
      state.chapters = action.payload
    },

    // 影子跟练模式
    setShadowMode: (state, action: PayloadAction<boolean>) => {
      state.shadowMode = action.payload
      if (!action.payload) {
        state.shadowCurIdx = null
        state.shadowLoopCount = -1
        state.shadowStartTime = null
        state.shadowSpecialMode = 'none'
      } else {
        state.shadowStartTime = Date.now()
      }
    },
    setShadowCurIdx: (state, action: PayloadAction<number | null>) => {
      state.shadowCurIdx = action.payload
      if (action.payload !== null && state.shadowCurIdx === null) {
        state.shadowLoopProgress = 1
      } else if (action.payload !== null) {
        state.shadowLoopProgress = (state.shadowLoopProgress || 0) + 1
      }
    },
    setShadowLoopCount: (state, action: PayloadAction<number>) => {
      state.shadowLoopCount = action.payload
    },
    setShadowModeType: (state, action: PayloadAction<'loop' | 'echo'>) => {
      state.shadowModeType = action.payload
    },
    setShadowLoopProgress: (state, action: PayloadAction<number>) => {
      state.shadowLoopProgress = action.payload
    },
    setShadowStartTime: (state, action: PayloadAction<number | null>) => {
      state.shadowStartTime = action.payload
    },
    setShadowSpecialMode: (state, action: PayloadAction<'none' | 'infinite' | 'oneShot'>) => {
      state.shadowSpecialMode = action.payload
    },
    setShadowAll: (state, action: PayloadAction<{
      mode?: boolean
      curIdx?: number | null
      loopCount?: number
    }>) => {
      if (action.payload.mode !== undefined) {
        state.shadowMode = action.payload.mode
      }
      if (action.payload.curIdx !== undefined) {
        state.shadowCurIdx = action.payload.curIdx
      }
      if (action.payload.loopCount !== undefined) {
        state.shadowLoopCount = action.payload.loopCount
      }
    },

    setInfos: (state, action: PayloadAction<any[]>) => {
      state.infos = action.payload
    },
    setCurInfo: (state, action: PayloadAction<any>) => {
      state.curInfo = action.payload
    },
    setCurFetched: (state, action: PayloadAction<boolean>) => {
      state.curFetched = action.payload
    },
    setData: (state, action: PayloadAction<Transcript | undefined>) => {
      state.data = action.payload
    },
    setUploadedTranscript: (state, action: PayloadAction<Transcript | undefined>) => {
      state.uploadedTranscript = action.payload
    },
    setSegments: (state, action: PayloadAction<Segment[] | undefined>) => {
      state.segments = action.payload
    },
    setFold: (state, action: PayloadAction<boolean>) => {
      state.fold = action.payload
    },
    setInputting: (state, action: PayloadAction<boolean>) => {
      state.inputting = action.payload
    },

    // 遮罩功能
    setMaskSettings: (state, action: PayloadAction<Partial<MaskSettings>>) => {
      state.maskSettings = {
        ...state.maskSettings,
        ...action.payload,
      }
    },
    setMaskVisible: (state, action: PayloadAction<boolean>) => {
      if (state.tempData) {
        state.tempData.maskVisible = action.payload
      }
    },
    setMaskSettingsVisible: (state, action: PayloadAction<boolean>) => {
      if (state.tempData) {
        state.tempData.maskSettingsVisible = action.payload
      }
    },
  },
})

export const {
  setPath,
  setUrl,
  setTempReady,
  setTempData,
  setUploadedTranscript,
  setTotalHeight,
  setCheckAutoScroll,
  setCurOffsetTop,
  setFloatKeyPointsSegIdx,
  setFoldAll,
  setSegmentFold,
  setSummaryContent,
  setSummaryStatus,
  setSummaryError,
  setTitle,
  setSegments,
  setLastSummarizeTime,
  setLastTransTime,
  clearTransResults,
  addTransResults,
  addTaskId,
  delTaskId,
  setTaskIds,
  setAutoTranslate,
  setAutoScroll,
  setNoVideo,
  setReviewAction,
  setNeedScroll,
  setCurIdx,
  setEnvData,
  setEnvReady,
  setInfos,
  setCurInfo,
  setCurFetched,
  setData,
  setFold,
  setSearchText,
  setSearchResult,
  setInputting,
  addAskInfo,
  delAskInfo,
  mergeAskInfo,
  setCtime,
  setAuthor,
  setChapters,

  // 影子跟练模式
  setShadowMode,
  setShadowModeType,
  setShadowCurIdx,
  setShadowLoopCount,
  setShadowLoopProgress,
  setShadowStartTime,
  setShadowAll,
  setShadowSpecialMode,

  // 遮罩功能
  setMaskSettings,
  setMaskVisible,
  setMaskSettingsVisible,
} = slice.actions

export default slice.reducer
