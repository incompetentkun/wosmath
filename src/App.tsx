import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { GcdLcmPage } from './pages/GcdLcmPage'
import { PrimeFactPage } from './pages/PrimeFactPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/gcd" element={<GcdLcmPage />} />
      <Route path="/prime" element={<PrimeFactPage />} />
      <Route path="/:slug" element={<ToolPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
