import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Flyer from './components/Flyer.jsx'

const MIN_SCALE = 1
const MAX_SCALE = 3
const PAN_LIMIT = 45 // max pan in % of the circle

// Circle geometry as fractions of the artwork, mirroring the overlay in Flyer.jsx
const CIRCLE_CENTER_X = 0.517
const CIRCLE_CENTER_Y = 0.474
const CIRCLE_DIAMETER = 0.393 // of artwork width

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// Resolve an image URL/data-URL into an HTMLImageElement once decoded
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 40)}`))
    img.src = src
  })
}

// Ready-to-share captions so attendees don't have to write their own
const CAPTIONS = [
  {
    label: 'Official',
    text: `I'm excited to announce that I'll be attending the Riverine Community Youth Leaders' Dialogue, hosted by Blue Lagos Sustainability Initiative in conjunction with New Generation Directorate.

Theme: Unlocking the Blue Economy — Empowering Youths for Sustainable Riverine/Coastal Development and Inclusive Growth.

📅 Wednesday, 28th October 2026
🕒 10:00am Prompt
📍 Badore Ferry Terminal, Ajah, Lagos State

No community is left behind. See you there!

#BlueLagos #BlueEconomy #YouthLeaders #RiverineCommunity #NewGenerationDirectorate`,
  },
  {
    label: 'Short & sweet',
    text: `Count me in! 🔵🟢 I'll be at the Riverine Community Youth Leaders' Dialogue — Unlocking the Blue Economy and empowering the next generation of coastal leaders.

📅 28th Oct 2026 · 🕒 10am · 📍 Badore Ferry Terminal, Ajah, Lagos

#BlueLagos #BlueEconomy #YouthLeadership`,
  },
  {
    label: 'Hype',
    text: `🟢🔵 The future of our riverine and coastal communities is youth-powered — and I'm showing up for it!

Join me at the Riverine Community Youth Leaders' Dialogue:
✨ Unlocking the Blue Economy
✨ Empowering Youths for Sustainable Development & Inclusive Growth

📅 Wednesday, 28th October 2026
🕒 10:00am prompt
📍 Badore Ferry Terminal, Ajah, Lagos State

#BlueLagos #BlueEconomy #SustainableDevelopment #YouthLeaders #Lagos`,
  },
]

export default function App() {
  const flyerRef = useRef(null)
  const fileInputRef = useRef(null)
  const panRef = useRef(null)
  const noticeTimerRef = useRef(null)

  const [photo, setPhoto] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isFileDragging, setIsFileDragging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState(null)

  const showNotice = useCallback((message) => {
    setNotice(message)
    clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(null), 3200)
  }, [])

  useEffect(() => () => clearTimeout(noticeTimerRef.current), [])

  const loadFile = useCallback(
    (file) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        showNotice('Please choose an image file (JPG or PNG).')
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhoto(e.target.result)
        setScale(1)
        setOffset({ x: 0, y: 0 })
      }
      reader.onerror = () => showNotice('Could not read that file. Please try another.')
      reader.readAsDataURL(file)
    },
    [showNotice],
  )

  const openPicker = useCallback(() => fileInputRef.current?.click(), [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsFileDragging(false)
      loadFile(e.dataTransfer?.files?.[0])
    },
    [loadFile],
  )

  /* ---------- pan (drag the photo inside the circle) ---------- */

  const handlePanStart = (e) => {
    if (!photo) return
    const rect = e.currentTarget.getBoundingClientRect()
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      rect,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePanMove = (e) => {
    const pan = panRef.current
    if (!pan) return
    const dx = ((e.clientX - pan.startX) / pan.rect.width) * 100
    const dy = ((e.clientY - pan.startY) / pan.rect.height) * 100
    if (Math.abs(dx) > 0.6 || Math.abs(dy) > 0.6) pan.moved = true
    setOffset({
      x: clamp(pan.originX + dx, -PAN_LIMIT, PAN_LIMIT),
      y: clamp(pan.originY + dy, -PAN_LIMIT, PAN_LIMIT),
    })
  }

  const handlePanEnd = (e) => {
    const moved = panRef.current?.moved ?? false
    panRef.current = { ...(panRef.current ?? {}), moved }
    // Swallow the click that follows a real drag, so the picker doesn't open
    setTimeout(() => {
      panRef.current = null
    }, 0)
    if (moved) {
      e.currentTarget.addEventListener(
        'click',
        (ev) => {
          ev.stopPropagation()
          ev.preventDefault()
        },
        { once: true, capture: true },
      )
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer capture already released */
    }
  }

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const removePhoto = useCallback(() => {
    setPhoto(null)
    resetView()
  }, [resetView])

  const changeZoom = (next) => {
    const newScale = clamp(Number(next), MIN_SCALE, MAX_SCALE)
    setScale(newScale)
    if (newScale <= MIN_SCALE) setOffset({ x: 0, y: 0 })
  }

  /* ---------- copy a suggested caption ---------- */

  const [copiedIndex, setCopiedIndex] = useState(null)

  const copyCaption = useCallback(
    async (text, index) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        showNotice('Caption copied — paste it when you share! 📋')
        setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 2200)
      } catch {
        // Fallback for browsers/environments without the async clipboard API
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          setCopiedIndex(index)
          showNotice('Caption copied — paste it when you share! 📋')
          setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 2200)
        } catch {
          showNotice('Could not copy. Please select the text manually.')
        }
      }
    },
    [showNotice],
  )

  /* ---------- download the flyer with the photo baked in ----------
     Instead of scraping the DOM (flaky with modern CSS), we composite the
     original artwork + the user's photo on a canvas. Deterministic and fast. */

  const exportFlyer = useCallback(async () => {
    if (!photo || exporting) return
    setExporting(true)
    try {
      const artwork = await loadImage('flyer.png')
      const userPhoto = await loadImage(photo)

      const W = artwork.naturalWidth
      const H = artwork.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')

      // 1) base flyer artwork
      ctx.drawImage(artwork, 0, 0, W, H)

      // 2) the circular photo, matching the on-screen object-cover + pan/zoom
      const diameter = CIRCLE_DIAMETER * W
      const cx = CIRCLE_CENTER_X * W
      const cy = CIRCLE_CENTER_Y * H

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2)
      ctx.clip()

      // object-cover: scale so the image fills the circle, then apply user zoom/pan
      const coverScale = Math.max(diameter / userPhoto.naturalWidth, diameter / userPhoto.naturalHeight)
      const drawW = userPhoto.naturalWidth * coverScale * scale
      const drawH = userPhoto.naturalHeight * coverScale * scale
      // offset is a % of the circle size, same as the CSS transform
      const dx = cx - drawW / 2 + (offset.x / 100) * diameter
      const dy = cy - drawH / 2 + (offset.y / 100) * diameter
      ctx.drawImage(userPhoto, dx, dy, drawW, drawH)
      ctx.restore()

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'blue-lagos-i-will-be-attending.png'
      link.href = dataUrl
      link.click()
      showNotice('Flyer downloaded — go share it! 🎉')
    } catch (err) {
      console.error('Export failed:', err)
      showNotice('Something went wrong while exporting. Please try again.')
    } finally {
      setExporting(false)
    }
  }, [photo, scale, offset, exporting, showNotice])

  /* ---------- UI ---------- */

  const buttonBase =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/40 disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <div className="min-h-screen w-full font-poppins">
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-8 sm:py-12">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 text-center"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            I Will Be <span className="text-sky-400">Attending</span>
          </h1>
          <p className="mt-1.5 text-sm text-sky-100/70">
            Add your photo to the circle, then download and share your flyer.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
          className="w-full"
        >
          <Flyer
            flyerRef={flyerRef}
            photo={photo}
            scale={scale}
            offset={offset}
            isFileDragging={isFileDragging}
            onOpenPicker={openPicker}
            onFileDrop={handleDrop}
            onDragStateChange={setIsFileDragging}
            onPanStart={handlePanStart}
            onPanMove={handlePanMove}
            onPanEnd={handlePanEnd}
            onResetView={resetView}
          />
        </motion.div>

        {/* Hidden native file input — the “media storage” picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            loadFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
          className="mt-7 flex w-full flex-col items-center gap-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={openPicker}
              className={`${buttonBase} bg-gradient-to-r from-[#1150c4] to-[#26a97c] text-white hover:from-[#0e44a8] hover:to-[#1f9169]`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {photo ? 'Change photo' : 'Upload photo'}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={exportFlyer}
              disabled={!photo || exporting}
              className={`${buttonBase} bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/20`}
            >
              {exporting ? (
                <motion.svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
                </motion.svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              {exporting ? 'Preparing…' : 'Download PNG'}
            </motion.button>
          </div>

          {/* Zoom + reset + remove — only once a photo is set */}
          <AnimatePresence>
            {photo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden"
              >
                <div className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => changeZoom(scale - 0.25)}
                    disabled={scale <= MIN_SCALE}
                    aria-label="Zoom out"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-35"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <input
                    type="range"
                    min={MIN_SCALE}
                    max={MAX_SCALE}
                    step={0.05}
                    value={scale}
                    onChange={(e) => changeZoom(e.target.value)}
                    aria-label="Photo zoom"
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => changeZoom(scale + 0.25)}
                    disabled={scale >= MAX_SCALE}
                    aria-label="Zoom in"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-35"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="shrink-0 text-xs font-medium text-sky-100/60">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetView}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-sky-100/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Reset view
                  </button>
                  <span className="h-4 w-px bg-white/15" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-rose-300/90 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove photo
                  </button>
                </div>

                <p className="text-[11px] text-sky-100/45">
                  Tip: drag the photo inside the circle to reposition · double-click to reset
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Small status notice */}
          <AnimatePresence>
            {notice && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-sky-100/90 ring-1 ring-white/15"
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Suggested captions — tap to copy */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          className="mt-12 w-full"
        >
          <div className="mb-4 flex items-center justify-center gap-2 text-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <h2 className="text-base font-bold text-white sm:text-lg">
              Suggested <span className="text-sky-400">captions</span>
            </h2>
          </div>
          <p className="mx-auto mb-5 max-w-md text-center text-xs text-sky-100/55">
            Copy one and paste it with your flyer — no need to think of what to write.
          </p>

          <div className="flex flex-col gap-3">
            {CAPTIONS.map((caption, index) => (
              <motion.div
                key={caption.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.08, ease: 'easeOut' }}
                className="group rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] sm:p-5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-sky-400/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/25">
                    {caption.label}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => copyCaption(caption.text, index)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/40 ${
                      copiedIndex === index
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40'
                        : 'bg-white/10 text-sky-100 ring-1 ring-white/15 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {copiedIndex === index ? (
                      <>
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </motion.button>
                </div>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-sky-50/75">
                  {caption.text}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  )
}
