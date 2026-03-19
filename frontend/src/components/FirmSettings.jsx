import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series C+']
const GEOS = ['North America', 'Europe', 'Asia', 'Latin America', 'Global']
const EXCLUDE_OPTIONS = [
  'crypto', 'gambling', 'defense', 'hardware', 'consumer', 'social media',
  'biotech', 'real estate', 'retail', 'media & entertainment', 'energy', 'government',
]

export default function FirmSettings({ API, onSaved, onClose, onToast }) {
  const { getToken } = useAuth()
  const [firmName, setFirmName] = useState('')
  const [investmentThesis, setInvestmentThesis] = useState('')
  const [investmentStages, setInvestmentStages] = useState(['Pre-Seed', 'Seed'])
  const [geographyFocus, setGeographyFocus] = useState(['North America'])
  const [checkSizeMin, setCheckSizeMin] = useState(250000)
  const [checkSizeMax, setCheckSizeMax] = useState(2000000)
  const [excludedSectors, setExcludedSectors] = useState([])
  const [fitThreshold, setFitThreshold] = useState(3)
  const [notifyTopMatch, setNotifyTopMatch] = useState(true)
  const [notifyDiligenceSignal, setNotifyDiligenceSignal] = useState(true)
  const [notifyWeeklySummary, setNotifyWeeklySummary] = useState(true)
  const [notifyMinFitScore, setNotifyMinFitScore] = useState(4)
  const [notificationEmails, setNotificationEmails] = useState(['remi@balassanian.com', '', ''])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fn = async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      try {
        const res = await axios.get(`${API}/firm-profile/`, { headers })
        const data = res.data
        if (data) {
        setFirmName(data.firm_name || '')
        setInvestmentThesis(data.investment_thesis || '')
        setInvestmentStages(data.investment_stages || ['Pre-Seed', 'Seed'])
        setGeographyFocus(data.geography_focus || ['North America'])
        setCheckSizeMin(data.check_size_min ?? 250000)
        setCheckSizeMax(data.check_size_max ?? 2000000)
        setExcludedSectors(data.excluded_sectors || [])
        setFitThreshold(data.fit_threshold ?? 3)
        setNotifyTopMatch(data.notify_top_match ?? true)
        setNotifyDiligenceSignal(data.notify_diligence_signal ?? true)
        setNotifyWeeklySummary(data.notify_weekly_summary ?? true)
        setNotifyMinFitScore(data.notify_min_fit_score ?? 4)
        const emails = (data.notification_emails || '').split(',').map(e => e.trim())
        while (emails.length < 3) emails.push('')
        setNotificationEmails(emails)
        }
      } catch (_) {}
    }
    fn()
  }, [API, getToken])

  const toggleArray = (setter, value) => {
    setter(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])
  }

  const handleSave = async () => {
    if (!firmName || !investmentThesis) return
    setSaving(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.put(`${API}/firm-profile/`, {
        firm_name: firmName,
        investment_thesis: investmentThesis,
        investment_stages: investmentStages,
        geography_focus: geographyFocus,
        check_size_min: checkSizeMin,
        check_size_max: checkSizeMax,
        excluded_sectors: excludedSectors,
        fit_threshold: fitThreshold,
        notify_top_match: notifyTopMatch,
        notify_diligence_signal: notifyDiligenceSignal,
        notify_weekly_summary: notifyWeeklySummary,
        notify_min_fit_score: notifyMinFitScore,
        notification_emails: notificationEmails.filter(e => e.trim()).join(','),
      }, { headers })
      if (onSaved) onSaved(res.data)
      if (onClose) onClose()
    } catch (e) {}
    setSaving(false)
  }

  const handleSaveAndRescore = async () => {
    if (!firmName || !investmentThesis) return
    const payload = {
      firm_name: firmName,
      investment_thesis: investmentThesis,
      investment_stages: investmentStages,
      geography_focus: geographyFocus,
      check_size_min: checkSizeMin,
      check_size_max: checkSizeMax,
      excluded_sectors: excludedSectors,
      fit_threshold: fitThreshold,
      notify_top_match: notifyTopMatch,
      notify_diligence_signal: notifyDiligenceSignal,
      notify_weekly_summary: notifyWeeklySummary,
      notify_min_fit_score: notifyMinFitScore,
      notification_emails: notificationEmails.filter(e => e.trim()).join(','),
    }
    setSaving(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.put(`${API}/firm-profile/`, payload, { headers })
      const profile = res.data
      fetch(`${API}/signals/rescore-all`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => {})
      if (onSaved) onSaved(profile)
      if (onClose) onClose()
      if (onToast) onToast({
        message: 'Rescoring companies against your updated thesis...',
        submessage: 'Your feed will refresh automatically as results come in.',
        duration: 10000,
      })
    } catch (e) {}
    setSaving(false)
  }

  const formatCurrency = (val) => {
    if (!val && val !== 0) return ''
    return '$' + Number(val).toLocaleString('en-US')
  }
  const parseCurrency = (str) => {
    const num = parseInt(str.replace(/[^0-9]/g, ''))
    return isNaN(num) ? '' : num
  }

  const inputStyle = {
    width: '100%', background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 7,
    color: '#c0c0e0', fontSize: 13, padding: '9px 12px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, sans-serif'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#0d0d14', border: '1px solid #2a2a4a', borderRadius: 16, width: 560, maxHeight: '90vh', overflow: 'auto', padding: '36px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#555577', fontSize: 20, cursor: 'pointer' }}>✕</button>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>◈</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>Firm Settings</h2>
          </div>
          <p style={{ fontSize: 13, color: '#555577', margin: 0 }}>Update your mandate and notification preferences.</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>FIRM NAME</label>
          <input value={firmName} onChange={e => setFirmName(e.target.value)} placeholder="e.g. Failup Ventures" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>INVESTMENT THESIS</label>
          <textarea value={investmentThesis} onChange={e => setInvestmentThesis(e.target.value)} placeholder="e.g. We invest in AI-native B2B SaaS..." style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>INVESTMENT STAGES</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.map(s => (
              <button key={s} onClick={() => toggleArray(setInvestmentStages, s)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid',
                borderColor: investmentStages.includes(s) ? '#3730a3' : '#2a2a4a',
                background: investmentStages.includes(s) ? '#1e1b4b' : 'transparent',
                color: investmentStages.includes(s) ? '#a5b4fc' : '#555577',
                fontSize: 12, fontWeight: investmentStages.includes(s) ? 600 : 400, cursor: 'pointer'
              }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>GEOGRAPHY FOCUS</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GEOS.map(g => (
              <button key={g} onClick={() => toggleArray(setGeographyFocus, g)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid',
                borderColor: geographyFocus.includes(g) ? '#3730a3' : '#2a2a4a',
                background: geographyFocus.includes(g) ? '#1e1b4b' : 'transparent',
                color: geographyFocus.includes(g) ? '#a5b4fc' : '#555577',
                fontSize: 12, fontWeight: geographyFocus.includes(g) ? 600 : 400, cursor: 'pointer'
              }}>{g}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>CHECK SIZE RANGE</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={formatCurrency(checkSizeMin)} onChange={e => setCheckSizeMin(parseCurrency(e.target.value))} placeholder="$500,000" style={{ ...inputStyle, flex: 1 }} />
            <span style={{ color: '#555577' }}>to</span>
            <input value={formatCurrency(checkSizeMax)} onChange={e => setCheckSizeMax(parseCurrency(e.target.value))} placeholder="$5,000,000" style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>EXCLUDED SECTORS</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXCLUDE_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleArray(setExcludedSectors, s)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid',
                borderColor: excludedSectors.includes(s) ? '#7f1d1d' : '#2a2a4a',
                background: excludedSectors.includes(s) ? '#2d0a0a' : 'transparent',
                color: excludedSectors.includes(s) ? '#fca5a5' : '#555577',
                fontSize: 12, fontWeight: excludedSectors.includes(s) ? 600 : 400, cursor: 'pointer'
              }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>MINIMUM FIT THRESHOLD</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input type="range" min={1} max={5} value={fitThreshold} onChange={e => setFitThreshold(Number(e.target.value))} style={{ flex: 1, accentColor: '#6366f1' }} />
            <div style={{ minWidth: 120, fontSize: 13, color: '#a5b4fc', fontWeight: 600 }}>
              {fitThreshold === 1 && 'Show all (1+)'}
              {fitThreshold === 2 && 'Weak Fit (2+)'}
              {fitThreshold === 3 && 'Possible Fit (3+)'}
              {fitThreshold === 4 && 'Strong Fit (4+)'}
              {fitThreshold === 5 && 'Top Match only (5)'}
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #1e1e2e' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0ff', marginBottom: 4 }}>
            Notification Preferences
          </div>
          <div style={{ fontSize: 12, color: '#555577', marginBottom: 24 }}>
            Choose which alerts Radar sends and where to send them.
          </div>

          {/* Alert Toggles */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 1, marginBottom: 14 }}>
              ALERT TYPES
            </div>

            {[
              { key: 'topMatch', label: 'New Top Match', desc: 'Email when a 4/5 or 5/5 company is added after a scrape', value: notifyTopMatch, setter: setNotifyTopMatch },
              { key: 'diligence', label: 'Diligence Signal', desc: 'Email when a company in your diligence pipeline gets new signals', value: notifyDiligenceSignal, setter: setNotifyDiligenceSignal },
              { key: 'weekly', label: 'Weekly Summary', desc: 'Monday 8AM digest with new matches, pipeline snapshot, and stale deals', value: notifyWeeklySummary, setter: setNotifyWeeklySummary },
            ].map(({ key, label, desc, value, setter }) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: '#0a0a14', border: '1px solid #1e1e2e',
                borderRadius: 8, marginBottom: 8
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#555577' }}>{desc}</div>
                </div>
                <div
                  onClick={() => setter(!value)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: value ? '#6366f1' : '#1e1e2e',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 16
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: value ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Min Fit Score */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 1, marginBottom: 14 }}>
              TOP MATCH THRESHOLD
            </div>
            <div style={{ fontSize: 12, color: '#555577', marginBottom: 12 }}>
              Only send Top Match alerts for companies at or above this fit score.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[3, 4, 5].map(score => {
                const labels = { 3: 'Possible Fit (3+)', 4: 'Strong Fit (4+)', 5: 'Top Match only (5)' }
                const colors = { 3: '#f59e0b', 4: '#6366f1', 5: '#10b981' }
                const selected = notifyMinFitScore === score
                return (
                  <div
                    key={score}
                    onClick={() => setNotifyMinFitScore(score)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      border: `1px solid ${selected ? colors[score] : '#1e1e2e'}`,
                      background: selected ? `${colors[score]}15` : '#0a0a14',
                      color: selected ? colors[score] : '#555577',
                      fontSize: 12, fontWeight: selected ? 600 : 400,
                      transition: 'all 0.15s'
                    }}
                  >
                    {labels[score]}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Email Recipients */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 1, marginBottom: 14 }}>
              EMAIL RECIPIENTS
            </div>
            <div style={{ fontSize: 12, color: '#555577', marginBottom: 12 }}>
              All alerts will be sent to these addresses (up to 3).
            </div>
            {notificationEmails.map((email, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <input
                  type="email"
                  placeholder={i === 0 ? 'Primary email (required)' : `Additional recipient ${i + 1} (optional)`}
                  value={email}
                  onChange={e => {
                    const updated = [...notificationEmails]
                    updated[i] = e.target.value
                    setNotificationEmails(updated)
                  }}
                  style={{
                    width: '100%', padding: '10px 14px', background: '#0a0a14',
                    border: '1px solid #1e1e2e', borderRadius: 8, color: '#f0f0ff',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button
            onClick={handleSave}
            disabled={saving || !firmName || !investmentThesis}
            style={{
              flex: 1, padding: '11px', borderRadius: 8,
              border: '1px solid #2a2a4a', background: 'transparent',
              color: '#a5b4fc', fontSize: 14, cursor: (saving || !firmName || !investmentThesis) ? 'not-allowed' : 'pointer', fontWeight: 500,
              opacity: (saving || !firmName || !investmentThesis) ? 0.6 : 1
            }}
          >
            Save Only
          </button>
          <button
            onClick={handleSaveAndRescore}
            disabled={saving || !firmName || !investmentThesis}
            style={{
              flex: 2, padding: '11px', borderRadius: 8, border: 'none',
              background: (saving || !firmName || !investmentThesis) ? '#2a2a4a' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: (saving || !firmName || !investmentThesis) ? '#555577' : '#fff',
              fontSize: 14, fontWeight: 600, cursor: (saving || !firmName || !investmentThesis) ? 'not-allowed' : 'pointer'
            }}
          >
            Save & Rescore →
          </button>
        </div>
      </div>
    </div>
  )
}
