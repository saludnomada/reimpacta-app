import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { mode, store } from './data'
import { RealApp } from './screens/auth/RealApp'
import { setAppMode } from './data/supabase'
import { useStore } from './data/store'
import { DemoBar } from './screens/DemoBar'
import { JoneApp } from './screens/jone/JoneApp'
import { PatientApp } from './screens/patient/PatientApp'

export default function App() {
  return mode === 'ejemplo' ? <DemoApp /> : <RealApp />
}

function DemoApp() {
  const s = useStore()
  useEffect(() => {
    void store.init()
  }, [])
  if (!s.data) return <div className="phone" aria-busy="true" />
  const p = s.data.patients.find((x) => x.id === s.session.patientId)
  return (
    <BrowserRouter>
      <DemoBar />
      <div className="demo-warn" role="status">
        Estás en la <b>DEMOSTRACIÓN</b>: lo que hagas aquí no se guarda en tu app real.{' '}
        <button onClick={() => setAppMode('real')}>Ir a mi app real</button>
      </div>
      {s.session.role === 'jone' ? <JoneApp /> : p ? <PatientApp p={p} /> : null}
    </BrowserRouter>
  )
}
