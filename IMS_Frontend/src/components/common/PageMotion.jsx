import { motion as Motion } from 'framer-motion'

export default function PageMotion({ children, className = '' }) {
  return (
    <Motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </Motion.div>
  )
}