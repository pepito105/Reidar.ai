import { useState, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function PortfolioImportModal({ API, onClose, onImported }) {
  const { getToken } = useAuth()
  const [portfolioText, setPortfolioText] = useState('')
  const [portfolioFile, setPortfolioFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [importedNames, setImportedNames] = useState([])
  const [importSuccess, setImportSuccess] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const fileContentRef = useRef('')

  const parseCSVLine = (line) => {
    const fields = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { current += '"'; i++ }
          else { inQuotes = false }
        } else { current += c }
      } else {
        if (c === '"') { inQuotes = true }
        else if (c === ',') { fields.push(current.trim()); current = '' }
        else { current += c }
      }
    }
    fields.push(current.trim())
    return fields
  }

  const parsePortfolioText = (text) => {
    return text.trim().split('\n').filter(l => l.trim()).map(line => {
      const parts = parseCSVLine(line).map(p => p.replace(/^"|"$/g, '').trim())
      return { name: parts[0] || '', website: parts[1] || '', description: parts[2] || '', stage: parts[3] || '' }
    }).filter(c => c.name && c.name.toLowerCase() !== 'name')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPortfolioFile(file.name)
    fileContentRef.current = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result ?? reader.result ?? ''
      fileContentRef.current = typeof text === 'string' ? text : ''
      setPortfolioText(fileContentRef.current)
    }
    reader.onerror = () => {
      setError('Could not read file.')
      fileContentRef.current = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    const textToImport = (portfolioText.trim() || fileContentRef.current || '').trim()
    if (!textToImport) return
    setImporting(true)
    setError(null)
    try {
      const companies = parsePortfolioText(textToImport)
      if (companies.length === 0) {
        setError('No companies found. Check your format.')
        setImporting(false)
        return
      }
      const token = await getToken().catch(() => null)
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API}/startups/portfolio-import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ companies }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || 'Import failed')
      setImportedCount(data?.imported ?? companies.length)
      setImportedNames(companies.map(c => c.name).filter(Boolean))
      setImportSuccess(true)
    } catch (e) {
      setError('Import failed. Check your format and try again.')
    }
    setImporting(false)
  }

  const hasContent = !!(portfolioText.trim() || fileContentRef.current?.trim())

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 2000, backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', pointerEvents: 'none',
      }}>
        <div style={{
          background: '#0d0d14', border: '1px solid #1e1e2e',
          borderRadius: 16, width: '100%', maxWidth: 560,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)', pointerEvents: 'all',
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #1e1e2e',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0ff' }}>Import Portfolio</div>
              <div style={{ fontSize: 12, color: '#555577', marginTop: 2 }}>
                One company per line: Name, Website, Description, Stage
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#555577', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
            >✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: 24 }}>
            {importSuccess ? (
              <div>
                <div style={{ background: '#0d2010', border: '1px solid #065f46', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
                  <div style={{ color: '#34d399', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                    {importedCount > 0 ? `${importedCount} companies imported` : 'Already in your database'}
                  </div>
                  <div style={{ color: '#8888aa', fontSize: 13, marginBottom: 12 }}>
                    Your portfolio is loaded. Radar will use these as sourcing context.
                  </div>
                  {importedNames.length > 0 && (
                    <div style={{ textAlign: 'left', maxHeight: 104, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>
                      {importedNames.map((name, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#8888aa', padding: '2px 0' }}>{name}</div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { onImported(); onClose() }}
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed #2a2a4a', borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 26, marginBottom: 6 }}>📂</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', marginBottom: 3 }}>
                    {portfolioFile || 'Upload CSV or TXT file'}
                  </div>
                  <div style={{ fontSize: 12, color: '#555577' }}>Name, Website, Description, Stage</div>
                  <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                </div>

                {!portfolioFile && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1, height: 1, background: '#2a2a4a' }} />
                      <span style={{ fontSize: 12, color: '#444466' }}>or paste manually</span>
                      <div style={{ flex: 1, height: 1, background: '#2a2a4a' }} />
                    </div>
                    <textarea
                      value={portfolioText}
                      onChange={e => setPortfolioText(e.target.value)}
                      placeholder={"Lotus Health, lotushealth.ai, AI-powered primary care, seed\nZettascale, zettascale.ai, AI compute infrastructure, seed"}
                      rows={4}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#0f0f1a', border: '1px solid #2a2a4a',
                        borderRadius: 8, color: '#f0f0ff', fontSize: 13,
                        padding: '10px 12px', resize: 'vertical', minHeight: 100,
                        lineHeight: 1.6, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </>
                )}

                {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{error}</div>}

                <button
                  onClick={handleImport}
                  disabled={importing || !hasContent}
                  style={{
                    width: '100%', marginTop: 14, padding: 12, borderRadius: 8, border: 'none',
                    background: hasContent ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#13131f',
                    color: hasContent ? '#fff' : '#555577',
                    fontSize: 14, fontWeight: 600,
                    cursor: hasContent ? 'pointer' : 'not-allowed',
                    opacity: importing ? 0.7 : 1,
                  }}
                >
                  {importing
                    ? 'Importing…'
                    : hasContent
                      ? `Import ${parsePortfolioText((portfolioText.trim() || fileContentRef.current || '')).length} companies`
                      : 'Import Portfolio'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
