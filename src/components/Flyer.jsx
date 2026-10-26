import { AnimatePresence, motion } from 'framer-motion'

/**
 * The flyer itself: the original artwork as the base layer, with an
 * interactive upload circle layered exactly over the gray placeholder.
 *
 * Geometry (artwork is 1145 x 1153):
 *   circle center  ~ (592, 547)  ->  left 51.7% / top 47.4%
 *   gray inner circle diameter ~ 450px  ->  39.3% of width
 */
export default function Flyer({
  flyerRef,
  photo,
  scale,
  offset,
  isFileDragging,
  onOpenPicker,
  onFileDrop,
  onDragStateChange,
  onPanStart,
  onPanMove,
  onPanEnd,
  onResetView,
}) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '100.7%' }}>
      <div
        ref={flyerRef}
        className="absolute inset-0 overflow-hidden rounded-2xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
      >
        {/* Original flyer artwork */}
        <img
          src="flyer.png"
          alt="Blue Lagos — Riverine Community Youth Leaders’ Dialogue flyer"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
        />

        {/* Interactive photo circle, sitting exactly on the gray placeholder */}
        <div
          className="absolute"
          style={{
            left: '51.7%',
            top: '47.4%',
            width: '39.3%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <button
            type="button"
            onClick={onOpenPicker}
            onDragOver={(e) => {
              e.preventDefault()
              onDragStateChange(true)
            }}
            onDragEnter={(e) => {
              e.preventDefault()
              onDragStateChange(true)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) onDragStateChange(false)
            }}
            onDrop={onFileDrop}
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={onPanEnd}
            onPointerCancel={onPanEnd}
            onDoubleClick={onResetView}
            aria-label={photo ? 'Change your photo' : 'Upload your photo'}
            className={`group relative block aspect-square w-full overflow-hidden rounded-full outline-none transition-shadow duration-300 ${
              photo
                ? 'cursor-grab active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-sky-400/70'
                : 'cursor-pointer focus-visible:ring-4 focus-visible:ring-sky-400/70'
            } ${isFileDragging ? 'ring-4 ring-emerald-400/80' : 'ring-0'}`}
          >
            {/* Uploaded photo (pan + zoom) */}
            <AnimatePresence>
              {photo && (
                <motion.div
                  key="photo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <img
                    src={photo}
                    alt="Your uploaded preview"
                    draggable={false}
                    className="h-full w-full touch-none rounded-full object-cover"
                    style={{
                      transform: `translate(${offset.x}%, ${offset.y}%) scale(${scale})`,
                      transition: 'transform 120ms ease-out',
                    }}
                  />
                  {/* Soft inner shade so the photo blends with the ring */}
                  <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_22px_rgba(4,24,58,0.35)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state / drop target */}
            {!photo && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white/55 backdrop-blur-[1.5px]"
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div
                  className={`absolute inset-[7%] rounded-full border-2 border-dashed transition-colors duration-200 ${
                    isFileDragging
                      ? 'border-emerald-500 bg-emerald-100/50'
                      : 'border-[#1b5ec9]/55'
                  }`}
                />
                <div
                  className={`flex h-[22%] w-[22%] items-center justify-center rounded-full shadow-md transition-colors ${
                    isFileDragging ? 'bg-emerald-500' : 'bg-[#1150c4]'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-1/2 w-1/2"
                    aria-hidden="true"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <p className="mt-[4%] px-[12%] text-center text-[clamp(9px,1.1vw,15px)] font-semibold leading-tight text-[#0d3b8c] sm:text-[clamp(11px,1.6vw,17px)]">
                  {isFileDragging ? 'Drop it here!' : 'Click to upload'}
                </p>
                <p className="px-[10%] text-center text-[clamp(7px,0.85vw,12px)] font-medium text-[#0d3b8c]/65 sm:text-[clamp(9px,1.2vw,14px)]">
                  or drag &amp; drop your photo
                </p>
              </motion.div>
            )}

            {/* “Change photo” hint on hover when a photo is set */}
            {photo && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[7%] flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="rounded-full bg-black/55 px-3 py-1 text-[clamp(8px,0.9vw,13px)] font-semibold text-white backdrop-blur-sm sm:text-[clamp(10px,1.3vw,15px)]">
                  Click to change
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
