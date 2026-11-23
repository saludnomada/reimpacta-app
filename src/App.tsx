import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { store } from './data'
import { useStore } from './data/store'
import { DemoBar } from './screens/DemoBar'
import { JoneApp } from './screens/jone/JoneApp'
import { PatientApp } from './screens/patient/PatientApp'

export default function App() {
  const s = useStore()
  useEffect(() => {
    void store.init()
  }, [])
  if (!s.data) return <div className="phone" aria-busy="true" />
  const p = s.data.patients.find((x) => x.id === s.session.patientId)
  return (
    <BrowserRouter>
      <DemoBar />
      {s.session.role === 'jone' ? <JoneApp /> : p ? <PatientApp p={p} /> : null}
    </BrowserRouter>
  )
}
