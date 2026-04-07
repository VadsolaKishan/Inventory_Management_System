import { AnimatePresence, motion as Motion } from 'framer-motion'
import { IoClose } from 'react-icons/io5'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Motion.div
            className={`w-full ${maxWidth} overflow-hidden rounded-2xl border border-white/70 bg-white shadow-card`}
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
                aria-label="Close modal"
              >
                <IoClose size={20} />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}