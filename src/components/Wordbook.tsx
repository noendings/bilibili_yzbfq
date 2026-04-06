import {useCallback, useEffect, useState} from 'react'
import {storageChromeClient} from '../utils/storage_chrome_client'
import {STORAGE_WORD_BOOK} from '../consts/const'
import {MdDelete, MdEdit, MdAdd, MdClose} from 'react-icons/md'
import {BsFillBookmarkFill} from 'react-icons/bs'
import {v4} from 'uuid'
import toast from 'react-hot-toast'
import classNames from 'classnames'

export interface WordBookItem {
  id: string
  content: string      // 句子内容
  videoUrl?: string    // 视频链接（可选）
  videoTitle?: string  // 视频标题
  createdAt: number    // 创建时间戳
  note?: string       // 用户笔记
}

interface WordbookProps {
  currentSegment?: {
    content: string    // 当前选中的句子内容
    videoUrl?: string  // 当前视频URL
    videoTitle?: string // 当前视频标题
    from?: number      // 开始时间
    to?: number        // 结束时间
  }
}

const Wordbook = (props: WordbookProps) => {
  const {currentSegment} = props
  const [items, setItems] = useState<WordBookItem[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editNote, setEditNote] = useState('')
  const [addContent, setAddContent] = useState('')
  const [addNote, setAddNote] = useState('')

  // 加载生词本数据
  const loadWordbook = useCallback(async () => {
    try {
      const data = await storageChromeClient.getStore(STORAGE_WORD_BOOK)
      if (data) {
        const parsed = JSON.parse(data)
        setItems(parsed)
      }
    } catch (error) {
      console.error('Failed to load wordbook:', error)
    }
  }, [])

  useEffect(() => {
    loadWordbook()
  }, [loadWordbook])

  // 保存生词本数据
  const saveWordbook = useCallback(async (newItems: WordBookItem[]) => {
    try {
      await storageChromeClient.setStore(STORAGE_WORD_BOOK, JSON.stringify(newItems))
      setItems(newItems)
    } catch (error) {
      console.error('Failed to save wordbook:', error)
      toast.error('保存失败')
    }
  }, [])

  // 添加生词
  const addWord = useCallback(async () => {
    if (!addContent.trim()) {
      toast.error('请输入句子内容')
      return
    }

    const newItem: WordBookItem = {
      id: v4(),
      content: addContent.trim(),
      videoUrl: currentSegment?.videoUrl,
      videoTitle: currentSegment?.videoTitle,
      createdAt: Date.now(),
      note: addNote.trim() || undefined,
    }

    const newItems = [newItem, ...items]
    await saveWordbook(newItems)
    setAddContent('')
    setAddNote('')
    setShowAddForm(false)
    toast.success('已添加到生词本')
  }, [addContent, addNote, currentSegment, items, saveWordbook])

  // 删除生词
  const deleteWord = useCallback(async (id: string) => {
    const newItems = items.filter(item => item.id !== id)
    await saveWordbook(newItems)
    toast.success('已删除')
  }, [items, saveWordbook])

  // 开始编辑
  const startEdit = useCallback((item: WordBookItem) => {
    setEditingId(item.id)
    setEditContent(item.content)
    setEditNote(item.note || '')
  }, [])

  // 保存编辑
  const saveEdit = useCallback(async () => {
    if (!editContent.trim()) {
      toast.error('句子内容不能为空')
      return
    }

    const newItems = items.map(item => {
      if (item.id === editingId) {
        return {
          ...item,
          content: editContent.trim(),
          note: editNote.trim() || undefined,
        }
      }
      return item
    })

    await saveWordbook(newItems)
    setEditingId(null)
    setEditContent('')
    setEditNote('')
    toast.success('已更新')
  }, [editContent, editNote, editingId, items, saveWordbook])

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditContent('')
    setEditNote('')
  }, [])

  // 快速添加当前句子
  const quickAddCurrent = useCallback(async () => {
    if (!currentSegment?.content) {
      toast.error('没有选中的句子')
      return
    }

    // 检查是否已存在
    const exists = items.some(item => item.content === currentSegment.content)
    if (exists) {
      toast('该句子已在生词本中')
      return
    }

    setAddContent(currentSegment.content)
    setAddNote('')
    setShowAddForm(true)
  }, [currentSegment, items])

  return (
    <div className='flex flex-col gap-2 p-2'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <BsFillBookmarkFill className='text-primary' />
          <span className='font-medium'>生词本</span>
          <span className='text-xs desc'>({items.length}条)</span>
        </div>
        <div className='flex gap-1'>
          {currentSegment?.content && (
            <button
              className='btn btn-xs btn-primary'
              onClick={quickAddCurrent}
              title='添加当前句子'
            >
              <MdAdd /> 添加当前
            </button>
          )}
          <button
            className={classNames('btn btn-xs', showAddForm ? 'btn-error' : 'btn-primary')}
            onClick={() => {
              setShowAddForm(!showAddForm)
              if (showAddForm) {
                setAddContent('')
                setAddNote('')
              }
            }}
          >
            {showAddForm ? <MdClose /> : <MdAdd />}
            {showAddForm ? '取消' : '手动添加'}
          </button>
        </div>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className='flex flex-col gap-2 p-2 bg-base-200 rounded'>
          <textarea
            className='textarea textarea-bordered textarea-sm w-full'
            placeholder='输入句子内容...'
            value={addContent}
            onChange={e => setAddContent(e.target.value)}
            rows={3}
          />
          <textarea
            className='textarea textarea-bordered textarea-sm w-full'
            placeholder='添加笔记（可选）...'
            value={addNote}
            onChange={e => setAddNote(e.target.value)}
            rows={2}
          />
          {currentSegment?.videoUrl && (
            <div className='text-xs desc'>
              来源: {currentSegment.videoTitle || currentSegment.videoUrl}
            </div>
          )}
          <div className='flex justify-end'>
            <button className='btn btn-sm btn-primary' onClick={addWord}>
              保存
            </button>
          </div>
        </div>
      )}

      {/* 生词列表 */}
      <div className='flex flex-col gap-1 max-h-[300px] overflow-y-auto'>
        {items.length === 0 && !showAddForm && (
          <div className='text-center text-xs desc py-4'>
            生词本为空，点击"添加当前"或"手动添加"来收藏句子
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className='p-2 bg-base-100 rounded border border-base-200 hover:border-primary/50 transition-colors'>
            {editingId === item.id ? (
              // 编辑模式
              <div className='flex flex-col gap-2'>
                <textarea
                  className='textarea textarea-bordered textarea-sm w-full'
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={2}
                />
                <textarea
                  className='textarea textarea-bordered textarea-sm w-full'
                  placeholder='笔记...'
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  rows={2}
                />
                <div className='flex justify-end gap-2'>
                  <button className='btn btn-xs' onClick={cancelEdit}>取消</button>
                  <button className='btn btn-xs btn-primary' onClick={saveEdit}>保存</button>
                </div>
              </div>
            ) : (
              // 显示模式
              <>
                <div className='flex justify-between items-start'>
                  <div className='flex-1'>
                    <div className='text-sm'>{item.content}</div>
                    {item.note && (
                      <div className='text-xs desc mt-1'>笔记: {item.note}</div>
                    )}
                    {item.videoUrl && (
                      <div className='text-xs desc mt-1'>
                        来自: {item.videoTitle || item.videoUrl}
                      </div>
                    )}
                  </div>
                  <div className='flex gap-1 ml-2'>
                    <button
                      className='btn btn-ghost btn-xs btn-circle'
                      onClick={() => startEdit(item)}
                      title='编辑'
                    >
                      <MdEdit />
                    </button>
                    <button
                      className='btn btn-ghost btn-xs btn-circle text-error'
                      onClick={() => deleteWord(item.id)}
                      title='删除'
                    >
                      <MdDelete />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Wordbook
