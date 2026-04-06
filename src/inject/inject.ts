import { TOTAL_HEIGHT_DEF, HEADER_HEIGHT, TOTAL_HEIGHT_MIN, TOTAL_HEIGHT_MAX, IFRAME_ID, STORAGE_ENV, DEFAULT_USE_PORT, MASK_ID, MASK_STORAGE_KEY, MASK_DEFAULT_WIDTH, MASK_DEFAULT_HEIGHT, MASK_DEFAULT_TOP, MASK_DEFAULT_LEFT } from '@/consts/const'
import { AllExtensionMessages, AllInjectMessages, AllAPPMessages } from '@/message-typings'
import { InjectMessaging } from '../message'

const debug = (...args: any[]) => {
  console.debug('[Inject]', ...args)
}

(async function () {
  // 如果路径不是/video或/list，则不注入
  if (!location.pathname.startsWith('/video') && !location.pathname.startsWith('/list')) {
    debug('Not inject')
    return
  }

  // 读取envData
  const envDataStr = (await chrome.storage.sync.get(STORAGE_ENV))[STORAGE_ENV]
  let sidePanel: boolean | null = null
  let manualInsert: boolean | null = null
  if (envDataStr) {
    try {
      const envData = JSON.parse(envDataStr)
      debug('envData: ', envData)

      sidePanel = envData.sidePanel
      manualInsert = envData.manualInsert
    } catch (error) {
      console.error('Error parsing envData:', error)
    }
  }

  const runtime: {
    injectMessaging: InjectMessaging<AllExtensionMessages, AllInjectMessages, AllAPPMessages>
    // lastV?: string | null
    // lastVideoInfo?: VideoInfo

    fold: boolean

    videoElement?: HTMLVideoElement
    videoElementHeight: number

    showTrans: boolean
    curTrans?: string

    // 影子跟练模式
    shadowLoop: {
      startTime: number
      endTime: number
      loopCount: number
      remainingLoops: number
      mode: 'loop' | 'echo'  // loop=循环模式, echo=跟读模式
      userBuffer: number  // 用户缓冲时间（秒）
      sentenceDuration: number  // 当前句子时长（秒）
      pausedForUser: boolean  // 是否暂停等待用户
      pauseStartTime: number | null  // 暂停开始时间
      currentIdx: number  // 当前句子索引（跟读模式用）
      totalCount: number  // 总句子数
    } | null

    // 遮罩功能
    maskElement?: HTMLDivElement
    maskVisible: boolean
    maskSettings: {
      width: number
      height: number
      top: number
      left: number
    }
  } = {
    injectMessaging: new InjectMessaging(DEFAULT_USE_PORT),
    fold: true,
    videoElementHeight: TOTAL_HEIGHT_DEF,
    showTrans: false,
    shadowLoop: null,
    maskVisible: false,
    maskSettings: {
      width: MASK_DEFAULT_WIDTH,
      height: MASK_DEFAULT_HEIGHT,
      top: MASK_DEFAULT_TOP,
      left: MASK_DEFAULT_LEFT,
    },
  }

  const getVideoElement = () => {
    const videoWrapper = document.getElementById('bilibili-player')
    return videoWrapper?.querySelector('video') as HTMLVideoElement | undefined
  }

  /**
   * @return if changed
   */
  const refreshVideoElement = () => {
    const newVideoElement = getVideoElement()
    const newVideoElementHeight = (newVideoElement != null) ? (Math.min(Math.max(newVideoElement.offsetHeight, TOTAL_HEIGHT_MIN), TOTAL_HEIGHT_MAX)) : TOTAL_HEIGHT_DEF
    if (newVideoElement === runtime.videoElement && Math.abs(newVideoElementHeight - runtime.videoElementHeight) < 1) {
      return false
    } else {
      runtime.videoElement = newVideoElement
      runtime.videoElementHeight = newVideoElementHeight
      // update iframe height
      updateIframeHeight()
      return true
    }
  }

  const createIframe = () => {
    var danmukuBox = document.getElementById('danmukuBox')
    if (danmukuBox) {
      var vKey = ''
      for (const key in danmukuBox?.dataset) {
        if (key.startsWith('v-')) {
          vKey = key
          break
        }
      }

      const iframe = document.createElement('iframe')
      iframe.id = IFRAME_ID
      iframe.src = chrome.runtime.getURL('index.html')
      iframe.style.border = 'none'
      iframe.style.width = '100%'
      iframe.style.height = '44px'
      iframe.style.marginBottom = '3px'
      iframe.allow = 'clipboard-read; clipboard-write;'

      if (vKey) {
        iframe.dataset[vKey] = danmukuBox?.dataset[vKey]
      }

      // insert before first child
      danmukuBox?.insertBefore(iframe, danmukuBox?.firstChild)

      // show badge
      runtime.injectMessaging.sendExtension('SHOW_FLAG', {
        show: true
      })

      debug('iframe inserted')

      return iframe
    }
  }

  if (!sidePanel && !manualInsert) {
    const timerIframe = setInterval(function () {
      var danmukuBox = document.getElementById('danmukuBox')
      if (danmukuBox) {
        clearInterval(timerIframe)

        // 延迟插入iframe（插入太快，网络较差时容易出现b站网页刷新，原因暂时未知，可能b站的某种机制？）
        setTimeout(createIframe, 1500)
      }
    }, 1000)
  }

  let aid: number | null = null
  let ctime: number | null = null
  let author: string | undefined
  let title = ''
  let pages: any[] = []
  let pagesMap: Record<string, any> = {}

  let lastAidOrBvid: string | null = null
  const refreshVideoInfo = async (force: boolean = false) => {
    if (force) {
      lastAidOrBvid = null
    }
    if (!sidePanel) {
      const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | undefined
      if (!iframe) return
    }

    // fix: https://github.com/IndieKKY/bilibili-subtitle/issues/5
    // 处理稍后再看的url( https://www.bilibili.com/list/watchlater?bvid=xxx&oid=xxx )
    const pathSearchs: Record<string, string> = {}
    // eslint-disable-next-line no-return-assign
    location.search.slice(1).replace(/([^=&]*)=([^=&]*)/g, (matchs, a, b, c) => pathSearchs[a] = b)

    // bvid
    let aidOrBvid = pathSearchs.bvid // 默认为稍后再看
    if (!aidOrBvid) {
      let path = location.pathname
      if (path.endsWith('/')) {
        path = path.slice(0, -1)
      }
      const paths = path.split('/')
      aidOrBvid = paths[paths.length - 1]
    }

    if (aidOrBvid !== lastAidOrBvid) {
      // console.debug('refreshVideoInfo')

      lastAidOrBvid = aidOrBvid
      if (aidOrBvid) {
        // aid,pages
        let cid: string | undefined
        /**
         * [
    {
        "type": 2,
        "from": 0,
        "to": 152, //单位秒
        "content": "发现美",
        "imgUrl": "http://i0.hdslb.com/bfs/vchapter/29168372111_0.jpg",
        "logoUrl": "",
        "team_type": "",
        "team_name": ""
    }
]
         */
        let chapters: any[] = []
        let subtitles
        if (aidOrBvid.toLowerCase().startsWith('av')) { // avxxx
          aid = parseInt(aidOrBvid.slice(2))
          pages = await fetch(`https://api.bilibili.com/x/player/pagelist?aid=${aid}`, { credentials: 'include' }).then(async res => await res.json()).then(res => res.data)
          cid = pages[0].cid
          ctime = pages[0].ctime
          author = pages[0].owner?.name
          title = pages[0].part
          await fetch(`https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid!}`, { credentials: 'include' }).then(async res => await res.json()).then(res => {
            chapters = res.data.view_points ?? []
            subtitles = res.data.subtitle.subtitles
          })
        } else { // bvxxx
          await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${aidOrBvid}`, { credentials: 'include' }).then(async res => await res.json()).then(async res => {
            title = res.data.title
            aid = res.data.aid
            cid = res.data.cid
            ctime = res.data.ctime
            author = res.data.owner?.name
            pages = res.data.pages
          })
          await fetch(`https://api.bilibili.com/x/player/wbi/v2?aid=${aid!}&cid=${cid!}`, { credentials: 'include' }).then(async res => await res.json()).then(res => {
            chapters = res.data.view_points ?? []
            subtitles = res.data.subtitle.subtitles
          })
        }

        // 筛选chapters里type为2的
        chapters = chapters.filter(chapter => chapter.type === 2)

        // pagesMap
        pagesMap = {}
        pages.forEach(page => {
          pagesMap[page.page + ''] = page
        })

        debug('refreshVideoInfo: ', aid, cid, pages, subtitles)

        // send setVideoInfo
        runtime.injectMessaging.sendApp(!!sidePanel, 'SET_VIDEO_INFO', {
          url: location.origin + location.pathname,
          title,
          aid,
          ctime,
          author,
          pages,
          chapters,
          infos: subtitles,
        })
      }
    }
  }

  let lastAid: number | null = null
  let lastCid: number | null = null
  const refreshSubtitles = () => {
    if (!sidePanel) {
      const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | undefined
      if (!iframe) return
    }

    const urlSearchParams = new URLSearchParams(window.location.search)
    const p = urlSearchParams.get('p') || 1
    const page = pagesMap[p]
    if (!page) return
    const cid: number | null = page.cid

    if (aid !== lastAid || cid !== lastCid) {
      debug('refreshSubtitles', aid, cid)

      lastAid = aid
      lastCid = cid
      if (aid && cid) {
        fetch(`https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`, {
          credentials: 'include',
        })
          .then(async res => await res.json())
          .then(res => {
            // remove elements with empty subtitle_url
            res.data.subtitle.subtitles = res.data.subtitle.subtitles.filter((item: any) => item.subtitle_url)
            if (res.data.subtitle.subtitles.length > 0) {
              runtime.injectMessaging.sendApp(!!sidePanel, 'SET_INFOS', {
                infos: res.data.subtitle.subtitles
              })
            }
          })
      }
    }
  }

  const updateIframeHeight = () => {
    const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | undefined
    if (iframe != null) {
      iframe.style.height = (runtime.fold ? HEADER_HEIGHT : runtime.videoElementHeight) + 'px'
    }
  }

  // 遮罩功能 - 创建遮罩
  const createMaskElement = () => {
    const existing = document.getElementById(MASK_ID)
    if (existing) return existing

    const mask = document.createElement('div')
    mask.id = MASK_ID
    mask.style.cssText = `
      position: fixed;
      background: rgba(0, 174, 236, 0.15);
      border: 2px solid rgba(0, 174, 236, 0.6);
      border-radius: 8px;
      z-index: 99999;
      cursor: move;
      display: none;
      backdrop-filter: blur(10px);
      transition: all 0.2s ease;
    `
    document.body.appendChild(mask)
    runtime.maskElement = mask
    return mask
  }

  // 遮罩功能 - 显示遮罩
  const showMask = (settings?: typeof runtime.maskSettings) => {
    const s = settings ?? runtime.maskSettings
    const mask = runtime.maskElement ?? createMaskElement()

    mask.style.width = `${s.width}px`
    mask.style.height = `${s.height}px`
    mask.style.top = `${s.top}px`
    mask.style.left = `${s.left}px`
    mask.style.display = 'block'
    runtime.maskVisible = true
  }

  // 遮罩功能 - 隐藏遮罩
  const hideMask = () => {
    if (runtime.maskElement) {
      runtime.maskElement.style.display = 'none'
    }
    runtime.maskVisible = false
  }

  // 遮罩功能 - 更新遮罩位置和大小
  const updateMask = (newSettings: Partial<typeof runtime.maskSettings>) => {
    runtime.maskSettings = { ...runtime.maskSettings, ...newSettings }
    if (runtime.maskVisible) {
      const mask = runtime.maskElement ?? createMaskElement()
      if (newSettings.width !== undefined) mask.style.width = `${newSettings.width}px`
      if (newSettings.height !== undefined) mask.style.height = `${newSettings.height}px`
      if (newSettings.top !== undefined) mask.style.top = `${newSettings.top}px`
      if (newSettings.left !== undefined) mask.style.left = `${newSettings.left}px`
    }
  }

  // 从存储加载遮罩设置
  const loadMaskSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(MASK_STORAGE_KEY)
      if (result[MASK_STORAGE_KEY]) {
        const saved = JSON.parse(result[MASK_STORAGE_KEY])
        runtime.maskSettings = {
          width: saved.width ?? MASK_DEFAULT_WIDTH,
          height: saved.height ?? MASK_DEFAULT_HEIGHT,
          top: saved.top ?? MASK_DEFAULT_TOP,
          left: saved.left ?? MASK_DEFAULT_LEFT,
        }
        // 如果已经设置过，显示遮罩
        if (saved.hasBeenSet) {
          showMask()
        }
      }
    } catch (e) {
      console.error('加载遮罩设置失败:', e)
    }
  }

  // 保存遮罩设置
  const saveMaskSettings = async (settings: typeof runtime.maskSettings, hasBeenSet: boolean = false) => {
    try {
      await chrome.storage.sync.set({
        [MASK_STORAGE_KEY]: JSON.stringify({
          ...settings,
          hasBeenSet,
        })
      })
    } catch (e) {
      console.error('保存遮罩设置失败:', e)
    }
  }

  // 初始化遮罩
  createMaskElement()
  loadMaskSettings()

  const methods: {
    [K in AllInjectMessages['method']]: (params: Extract<AllInjectMessages, { method: K }>['params'], context: MethodContext) => Promise<any>
  } = {
    TOGGLE_DISPLAY: async (params) => {
      const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | undefined
      if (iframe != null) {
        iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none'
        runtime.injectMessaging.sendExtension('SHOW_FLAG', {
          show: iframe.style.display !== 'none'
        })
      } else {
        createIframe()
      }
    },
    FOLD: async (params) => {
      runtime.fold = params.fold
      updateIframeHeight()
    },
    MOVE: async (params) => {
      const video = getVideoElement()
      if (video != null) {
        video.currentTime = params.time
        if (params.togglePause) {
          video.paused ? video.play() : video.pause()
        }
      }
    },
    GET_SUBTITLE: async (params) => {
      let url = params.info.subtitle_url
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://')
      }
      return await fetch(url).then(async res => await res.json())
    },
    GET_VIDEO_STATUS: async (params) => {
      const video = getVideoElement()
      if (video != null) {
        return {
          paused: video.paused,
          currentTime: video.currentTime
        }
      }
    },
    GET_VIDEO_ELEMENT_INFO: async (params) => {
      refreshVideoElement()
      return {
        noVideo: runtime.videoElement == null,
        totalHeight: runtime.videoElementHeight,
      }
    },
    REFRESH_VIDEO_INFO: async (params) => {
      refreshVideoInfo(params.force)
    },
    UPDATE_TRANS_RESULT: async (params) => {
      runtime.showTrans = true
      runtime.curTrans = params?.result

      let text = document.getElementById('trans-result-text')
      if (text) {
        text.innerHTML = runtime.curTrans ?? ''
      } else {
        const container = document.getElementsByClassName('bpx-player-subtitle-panel-wrap')?.[0]
        if (container) {
          const div = document.createElement('div')
          div.style.display = 'flex'
          div.style.justifyContent = 'center'
          div.style.margin = '2px'
          text = document.createElement('text')
          text.id = 'trans-result-text'
          text.innerHTML = runtime.curTrans ?? ''
          text.style.fontSize = '1rem'
          text.style.padding = '5px'
          text.style.color = 'white'
          text.style.background = 'rgba(0, 0, 0, 0.4)'
          div.append(text)

          container.append(div)
        }
      }
      text && (text.style.display = runtime.curTrans ? 'block' : 'none')
    },
    HIDE_TRANS: async (params) => {
      runtime.showTrans = false
      runtime.curTrans = undefined

      const text = document.getElementById('trans-result-text')
      if (text) {
        text.style.display = 'none'
      }
    },
    PLAY: async (params) => {
      const { play } = params
      const video = getVideoElement()
      if (video != null) {
        if (play) {
          await video.play()
        } else {
          video.pause()
        }
      }
    },
    DOWNLOAD_AUDIO: async (params) => {
      const html = document.getElementsByTagName('html')[0].innerHTML
      const playInfo = JSON.parse(html.match(/window.__playinfo__=(.+?)<\/script/)?.[1] ?? '{}')
      const audioUrl = playInfo.data.dash.audio[0].baseUrl

      fetch(audioUrl).then(async res => await res.blob()).then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${title}.m4s`
        a.click()
      })
    },

    // 影子跟练模式 - 单句循环
    SHADOW_LOOP: async (params) => {
      const video = getVideoElement()
      if (video) {
        // 清除之前的时间监听
        video.onended = null
        video.ontimeupdate = null

        if (params.enabled) {
          // 计算句子时长
          const sentenceDuration = params.endTime - params.startTime

          // 开始循环/跟读
          runtime.shadowLoop = {
            startTime: params.startTime,
            endTime: params.endTime,
            loopCount: params.loopCount,
            remainingLoops: params.loopCount,
            mode: params.mode || 'loop',
            userBuffer: params.userBuffer || 4,
            sentenceDuration,
            pausedForUser: false,
            pauseStartTime: null,
            currentIdx: params.currentIdx ?? 0,
            totalCount: params.totalCount ?? 0,
          }

          // 如果当前不在循环起点，跳过去并播放
          if (Math.abs(video.currentTime - params.startTime) > 0.5) {
            video.currentTime = params.startTime
          }

          // 确保播放
          if (video.paused) {
            video.play().catch(() => {})
          }

          // 使用 timeupdate 事件检测是否到达句子结束时间
          video.ontimeupdate = () => {
            if (!runtime.shadowLoop) return
            const sl = runtime.shadowLoop

            // 如果是跟读模式且已暂停等待用户，跳过时间检查
            if (sl.pausedForUser) return

            const currentTime = video.currentTime
            // 检测是否到达或超过句子结束时间
            if (currentTime >= sl.endTime - 0.1) {
              if (sl.mode === 'loop') {
                // 循环模式
                if (sl.remainingLoops === -1 || sl.remainingLoops > 0) {
                  // 回到句首
                  video.currentTime = sl.startTime
                  // 递减循环次数
                  if (sl.remainingLoops > 0) {
                    sl.remainingLoops--
                  }
                  // 确保继续播放
                  if (video.paused) {
                    video.play().catch(() => {})
                  }
                }
              } else {
                // 跟读模式 - 暂停等待用户
                video.pause()
                sl.pausedForUser = true
                sl.pauseStartTime = Date.now()
              }
            }
          }
        } else {
          // 停止循环
          runtime.shadowLoop = null
          video.onended = null
          video.ontimeupdate = null
        }
      }
    },

    // 影子跟练模式 - 退出
    SHADOW_EXIT: async (params) => {
      const video = getVideoElement()
      if (video) {
        runtime.shadowLoop = null
        video.onended = null
        video.ontimeupdate = null
      }
    },

    // 跟读模式暂停完成，通知面板切换下一句（这里实际上是路由到 app）
    SHADOW_ECHO_DONE: async (params) => {
      // 这个消息会被路由到 app 端处理
      return params
    },

    // 遮罩功能 - 显示/隐藏遮罩
    MASK: async (params) => {
      const { visible, settings } = params

      if (settings) {
        runtime.maskSettings = { ...runtime.maskSettings, ...settings }
      }

      if (visible) {
        // 显示遮罩
        runtime.maskVisible = true
        showMask(settings)
        // 保存设置
        await saveMaskSettings(runtime.maskSettings, true)
      } else {
        // 隐藏遮罩
        runtime.maskVisible = false
        hideMask()
        // 保存设置，标记已设置过
        await saveMaskSettings(runtime.maskSettings, true)
      }
    },

    // 获取遮罩设置
    GET_MASK_SETTINGS: async (params) => {
      return {
        settings: runtime.maskSettings,
        visible: runtime.maskVisible,
      }
    },

    // 更新遮罩设置（用于调整位置和大小）
    UPDATE_MASK_SETTINGS: async (params) => {
      const { width, height, top, left } = params
      const newSettings = { ...runtime.maskSettings }
      if (width !== undefined) newSettings.width = width
      if (height !== undefined) newSettings.height = height
      if (top !== undefined) newSettings.top = top
      if (left !== undefined) newSettings.left = left
      updateMask(newSettings)
      runtime.maskSettings = newSettings
      // 保存设置
      await saveMaskSettings(newSettings, true)
      return newSettings
    },
  }

  // 初始化injectMessage
  runtime.injectMessaging.init(methods)

    // 跟读模式定时检查 - 检测暂停时间是否到达
  let echoNextTimer: ReturnType<typeof setTimeout> | null = null

  const echoCheckInterval = setInterval(() => {
    if (!runtime.shadowLoop || runtime.shadowLoop.mode !== 'echo' || !runtime.shadowLoop.pausedForUser) {
      return
    }

    const sl = runtime.shadowLoop
    const elapsed = (Date.now() - (sl.pauseStartTime ?? Date.now())) / 1000
    const totalWait = sl.sentenceDuration + sl.userBuffer

    if (elapsed >= totalWait && !echoNextTimer) {
      // 时间到了，准备切换到下一句
      const video = getVideoElement()
      if (!video) return

      const nextIdx = sl.currentIdx + 1
      if (nextIdx >= sl.totalCount) {
        // 没有下一句了，退出跟读模式
        runtime.shadowLoop = null
        return
      }

      // 延迟一下再跳转，确保状态稳定
      echoNextTimer = setTimeout(() => {
        echoNextTimer = null
        if (!runtime.shadowLoop || runtime.shadowLoop.mode !== 'echo') return

        // 跳到当前句子的结束时间（即下一句的开始）
        video.currentTime = sl.endTime

        // 清除暂停状态，等待面板发送新的 SHADOW_LOOP 命令
        sl.pausedForUser = false
        sl.pauseStartTime = null

        // 通知面板当前句子完成，让面板更新 shadowCurIdx 并发送新命令
        runtime.injectMessaging.sendApp(null, 'SHADOW_ECHO_DONE', {
          completedIdx: sl.currentIdx,
          nextStartTime: sl.endTime
        }).catch(() => {})

        // 继续播放
        video.play().catch(() => {})
      }, 100)
    }
  }, 100)

  setInterval(() => {
    if (!sidePanel) {
      const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | undefined
      if (!iframe || iframe.style.display === 'none') return
    }

    refreshVideoInfo().catch(console.error)
    refreshSubtitles()
  }, 1000)
})()
