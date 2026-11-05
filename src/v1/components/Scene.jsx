import { useEffect, useRef } from 'react'
import { mountScene, reducedMotion } from '../../lib/canvas.js'

// Mounts one of the canvas scenes. `create` must be stable across renders.
export default function Scene({ create, options, className = '' }) {
  const ref = useRef(null)
  const optsRef = useRef(options)
  optsRef.current = options

  useEffect(() => {
    const scene = create({ reduce: reducedMotion(), ...optsRef.current })
    return mountScene(ref.current, scene)
  }, [create])

  return <canvas ref={ref} aria-hidden="true" className={`block h-full w-full ${className}`} />
}
