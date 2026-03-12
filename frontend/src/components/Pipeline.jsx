import { useState, useEffect } from 'react'
import axios from 'axios'

const STAGES = ['watching', 'outreach', 'diligence', 'passed', 'invested']
const STAGE_COLORS = {
  watching: '#6366f1', outreach: '#f59e0b', diligence: '#10b981', passed: '#6b7280', invested: '#8b5cf6'
}
const FIT_BADGES = {
  5: { label: 'Top Match', color: '#10b981' },
  4: { label: 'Strong Fit', color: '#6366f1' },
  3: { label: 'Possible Fit', color: '#f59e0b' },
  2: { label: 'Weak Fit', color: '#6b7280' },
}

const COLUMN_WIDTH = 260

function relativeTime(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const sec = (now - date) / 1000
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`
  return `${Math.floor(sec / 86400 / 7)}w ago`
}

export default function Pipeline({ API }) {
  const [board, setBoard] = useState({})
  const [dragging, setDragging] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPipeline = () => {
    axios.get(`${API}/pipeline/`).then(res => {
      setBoard(res.data)
      setLoading(false)
    })
  }

  useEffect(() => { fetchPipeline() }, [])

  const onDragStart = (company, fromStage) => setDragging({ company, fromStage })

  const onDragEnd = () => {
    setDragging(null)
    setDragOverStage(null)
  }

  const onDragOver = (e, stage) => {
    e.preventDefault()
    setDragOverStage(stage)
  }

  const onDrop = async (toStage) => {
    if (!dragging || dragging.fromStage === toStage) {
      setDragOverStage(null)
      setDragging(null)
      return
    }
    const fromStage = dragging.fromStage
    const company = dragging.company

    // Optimistic update: single setState
    setBoard(prev => {
      const next = {}
      STAGES.forEach(s => {
        next[s] = [...(prev[s] || [])]
      })
      next[fromStage] = next[fromStage].filter(c => c.id !== company.id)
      next[toStage] = [...next[toStage], { ...company }]
      return next
    })
    setDragging(null)
    setDragOverStage(null)

    try {
      await axios.post(`${API}/pipeline/move`, { startup_id: company.id, new_status: toStage })
    } catch {
      fetchPipeline()
    }
  }

  const totalInPipeline = STAGES.reduce((acc, s) => acc + (board[s]?.length || 0), 0)
  const isValidDropTarget = (stage) => dragging && dragging.fromStage !== stage

  return (
    <div style={{ padding: '28px 32px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', margin: 0, letterSpacing: '-0.5px' }}>Pipeline</h1>
        <p style={{ fontSize: 13, color: '#555577', margin: '4px 0 0' }}>{totalInPipeline} companies being tracked</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#555577', padding: 80 }}>Loading pipeline...</div>
      ) : totalInPipeline === 0 ? (
        <div style={{ textAlign: 'center', color: '#555577', padding: 80 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, marginBottom: 6 }}>Pipeline is empty</div>
          <div style={{ fontSize: 13 }}>Add companies from Coverage by setting their pipeline status</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const list = board[stage] || []
            const isEmpty = list.length === 0
            const isOver = dragOverStage === stage
            const color = STAGE_COLORS[stage]
            const showDropPlaceholder = dragging && isValidDropTarget(stage)

            return (
              <div
                key={stage}
                onDragOver={e => onDragOver(e, stage)}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => onDrop(stage)}
                style={{
                  minWidth: COLUMN_WIDTH,
                  flex: `0 0 ${COLUMN_WIDTH}px`,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  paddingTop: 4,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#555577' }}>{list.length}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 100,
                    background: isOver ? `${color}08` : '#0d0d14',
                    borderRadius: 10,
                    padding: 8,
                    border: isOver ? `2px solid ${color}` : '1px solid #1e1e2e',
                    borderTop: `3px solid ${color}`,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                >
                  {list.map(company => {
                    const isDraggingCard = dragging?.company?.id === company.id
                    return (
                      <div
                        key={company.id}
                        draggable
                        onDragStart={() => onDragStart(company, stage)}
                        onDragEnd={onDragEnd}
                        style={{
                          background: '#0f0f1a',
                          border: '1px solid #1e1e2e',
                          borderLeft: `3px solid ${color}`,
                          borderRadius: 8,
                          padding: '12px',
                          cursor: 'grab',
                          opacity: isDraggingCard ? 0.4 : 1,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#f0f0ff', marginBottom: 4 }}>{company.name}</div>
                        <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8, lineHeight: 1.4 }}>{company.one_liner}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {company.funding_stage && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#1a1a2e', color: '#6b7280' }}>{company.funding_stage}</span>}
                          {company.fit_score && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, color: FIT_BADGES[company.fit_score]?.color || '#6b7280' }}>● {FIT_BADGES[company.fit_score]?.label}</span>}
                          {company.updated_at && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#555577' }}>{relativeTime(company.updated_at)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {showDropPlaceholder && (
                    <div
                      style={{
                        border: `2px dashed ${color}`,
                        borderRadius: 8,
                        padding: 12,
                        color,
                        fontSize: 11,
                        textAlign: 'center',
                        background: `${color}0c`,
                        flexShrink: 0,
                      }}
                    >
                      Drop here
                    </div>
                  )}
                  {isEmpty && dragging && isValidDropTarget(stage) && isOver && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 120,
                        border: `2px dashed ${color}`,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        fontSize: 12,
                        background: `${color}0c`,
                      }}
                    >
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
