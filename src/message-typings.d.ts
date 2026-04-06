import {ExtensionMessage, InjectMessage, AppMessage} from './message'

// extension
interface ExtensionCloseSidePanelMessage extends ExtensionMessage {
  method: 'CLOSE_SIDE_PANEL'
}

interface ExtensionAddTaskMessage extends ExtensionMessage<{ taskDef: TaskDef }, Task> {
  method: 'ADD_TASK'
}

interface ExtensionGetTaskMessage extends ExtensionMessage<{ taskId: string }, {
  code: 'ok'
  task: Task
} | {
  code: 'not_found'
}> {
  method: 'GET_TASK'
}

interface ExtensionShowFlagMessage extends ExtensionMessage<{ show: boolean }> {
  method: 'SHOW_FLAG'
}

interface ExtensionGetTabIdMessage extends ExtensionMessage<{ show: boolean }> {
  method: 'GET_TAB_ID'
}

export type AllExtensionMessages = ExtensionGetTabIdMessage | ExtensionCloseSidePanelMessage | ExtensionAddTaskMessage | ExtensionGetTaskMessage | ExtensionShowFlagMessage

// inject
interface InjectToggleDisplayMessage extends InjectMessage<{}> {
  method: 'TOGGLE_DISPLAY'
}

interface InjectFoldMessage extends InjectMessage<{ fold: boolean }> {
  method: 'FOLD'
}

interface InjectMoveMessage extends InjectMessage<{ time: number, togglePause: boolean }> {
  method: 'MOVE'
}

interface InjectGetSubtitleMessage extends InjectMessage<{ info: any }> {
  method: 'GET_SUBTITLE'
}

interface InjectGetVideoStatusMessage extends InjectMessage<{}> {
  method: 'GET_VIDEO_STATUS'
}

interface InjectGetVideoElementInfoMessage extends InjectMessage<{}> {
  method: 'GET_VIDEO_ELEMENT_INFO'
}

interface InjectRefreshVideoInfoMessage extends InjectMessage<{ force: boolean }> {
  method: 'REFRESH_VIDEO_INFO'
}

interface InjectUpdateTransResultMessage extends InjectMessage<{ result: string }> {
  method: 'UPDATE_TRANS_RESULT'
}

interface InjectHideTransMessage extends InjectMessage<{}> {
  method: 'HIDE_TRANS'
}

interface InjectPlayMessage extends InjectMessage<{ play: boolean }> {
  method: 'PLAY'
}

interface InjectDownloadAudioMessage extends InjectMessage<{}> {
  method: 'DOWNLOAD_AUDIO'
}

// 影子跟练模式消息
interface InjectShadowLoopMessage extends InjectMessage<{
  enabled: boolean
  startTime: number
  endTime: number
  loopCount: number
  mode?: 'loop' | 'echo'
  userBuffer?: number
  currentIdx?: number
  totalCount?: number
}> {
  method: 'SHADOW_LOOP'
}

interface InjectShadowExitMessage extends InjectMessage<{}> {
  method: 'SHADOW_EXIT'
}

// 跟读模式暂停完成通知（inject -> app）
interface InjectShadowEchoDoneMessage extends InjectMessage<{
  completedIdx: number
  nextStartTime: number
}> {
  method: 'SHADOW_ECHO_DONE'
}

// 遮罩功能消息
interface InjectMaskMessage extends InjectMessage<{
  visible: boolean
  settings?: MaskSettings
}> {
  method: 'MASK'
}

interface InjectGetMaskSettingsMessage extends InjectMessage<{}> {
  method: 'GET_MASK_SETTINGS'
}

interface InjectUpdateMaskSettingsMessage extends InjectMessage<{
  width?: number
  height?: number
  top?: number
  left?: number
}> {
  method: 'UPDATE_MASK_SETTINGS'
}

export type AllInjectMessages = InjectToggleDisplayMessage | InjectFoldMessage | InjectMoveMessage | InjectGetSubtitleMessage | InjectGetVideoStatusMessage | InjectGetVideoElementInfoMessage | InjectRefreshVideoInfoMessage | InjectUpdateTransResultMessage | InjectHideTransMessage | InjectPlayMessage | InjectDownloadAudioMessage | InjectShadowLoopMessage | InjectShadowExitMessage | InjectShadowEchoDoneMessage | InjectMaskMessage | InjectGetMaskSettingsMessage | InjectUpdateMaskSettingsMessage

// app (also includes messages received from inject)
interface AppShadowEchoDoneMessage extends AppMessage<{
  completedIdx: number
  nextStartTime: number
}> {
  method: 'SHADOW_ECHO_DONE'
}

interface AppSetInfosMessage extends AppMessage<{ infos: any }> {
  method: 'SET_INFOS'
}

interface AppSetVideoInfoMessage extends AppMessage<{ url: string, title: string, aid: number | null, ctime: number | null, author?: string, pages: any, chapters: any, infos: any }> {
  method: 'SET_VIDEO_INFO'
}

export type AllAPPMessages = AppSetInfosMessage | AppSetVideoInfoMessage | AppShadowEchoDoneMessage
