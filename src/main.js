import './style.css'

const { PI, sin, cos, sqrt, pow } = Math
const SVG_NS = 'http://www.w3.org/2000/svg'
const svg = document.querySelector('#scene')

class CircleLocation {
  constructor(centerId, center, radius, angle, scale) {
    this.centerId = centerId
    this.center = center
    this.radius = radius
    this.angle = angle
    this.scale = scale
  }
}

class Intersection {
  constructor(position, locationA, locationB, element) {
    this.position = position
    this.locationA = locationA
    this.locationB = locationB
    this.element = element
  }
}

function rad(deg) {
  return (deg / 180) * PI
}

function intersect(x1, y1, r1, x2, y2, r2) {
  const dd = pow(x2 - x1, 2) + pow(y2 - y1, 2)
  const d = sqrt(dd)
  const a = (pow(r1, 2) - pow(r2, 2) + dd) / (2 * d)
  const h = sqrt(pow(r1, 2) - pow(a, 2))
  const px = x1 + (a * (x2 - x1)) / d
  const py = y1 + (a * (y2 - y1)) / d

  return [
    px - (h * (y2 - y1)) / d,
    py + (h * (x2 - x1)) / d,
    px + (h * (y2 - y1)) / d,
    py - (h * (x2 - x1)) / d,
  ]
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value))
  }
  return el
}

function angleFrom(center, point) {
  const radians = Math.atan2(point.y - center.y, point.x - center.x)
  const degrees = (radians * 180) / PI
  return (degrees + 360) % 360
}

let centers = null

function buildScene() {
  const width = window.innerWidth
  const height = window.innerHeight

  svg.setAttribute('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
  svg.replaceChildren()

  const group = svgEl('g', {
    transform: 'scale(1,-1)',
  })

  const base = 100
  const x0 = 0
  const y0 = base
  const x1 = base * sin(rad(120))
  const y1 = base * cos(rad(120))
  const x2 = base * sin(rad(240))
  const y2 = base * cos(rad(240))

  const r = base * sqrt(3)
  const scales = [0.85, 1, 1.15]

  for (const scale of scales) {
    const radius = r * scale
    group.append(
      svgEl('circle', { cx: x0, cy: y0, r: radius, class: 'orbit' })
    )
    group.append(
      svgEl('circle', { cx: x1, cy: y1, r: radius, class: 'orbit' })
    )
    group.append(
      svgEl('circle', { cx: x2, cy: y2, r: radius, class: 'orbit' })
    )
  }

  const points = []
  const intersections = []
  centers = {
    c0: { x: x0, y: y0 },
    c1: { x: x1, y: y1 },
    c2: { x: x2, y: y2 },
  }

  const pairs = [
    {
      a: { id: 'c2', x: x2, y: y2 },
      b: { id: 'c1', x: x1, y: y1 },
      colors: ['white', 'yellow'],
    },
    {
      a: { id: 'c1', x: x1, y: y1 },
      b: { id: 'c0', x: x0, y: y0 },
      colors: ['orange', 'red'],
    },
    {
      a: { id: 'c0', x: x0, y: y0 },
      b: { id: 'c2', x: x2, y: y2 },
      colors: ['green', 'blue'],
    },
  ]

  for (const pair of pairs) {
    for (let i = 0; i < scales.length; i++) {
      for (let j = 0; j < scales.length; j++) {
        const scaleA = scales[i]
        const scaleB = scales[j]
        const r3 = r * scaleA
        const r4 = r * scaleB
        const [x1, y1, x2, y2] = intersect(
          pair.a.x,
          pair.a.y,
          r3,
          pair.b.x,
          pair.b.y,
          r4
        )
        const intersectionsForPair = [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ].sort(
          (p, q) =>
            angleFrom({ x: 0, y: 0 }, p) - angleFrom({ x: 0, y: 0 }, q)
        )

        for (let k = 0; k < intersectionsForPair.length; k++) {
          const position = intersectionsForPair[k]
          const dot = svgEl('circle', {
            cx: position.x,
            cy: position.y,
            r: 10,
            class: 'node',
            fill: pair.colors[k],
            stroke: 'grey',
          })
          const locationA = new CircleLocation(
            pair.a.id,
            { x: pair.a.x, y: pair.a.y },
            r3,
            angleFrom({ x: pair.a.x, y: pair.a.y }, position),
            scaleA
          )
          const locationB = new CircleLocation(
            pair.b.id,
            { x: pair.b.x, y: pair.b.y },
            r4,
            angleFrom({ x: pair.b.x, y: pair.b.y }, position),
            scaleB
          )
          const ordered = [pair.a.id, pair.b.id].sort()
          const hit =
            pair.a.id === ordered[0]
              ? new Intersection(position, locationA, locationB, dot)
              : new Intersection(position, locationB, locationA, dot)
          intersections.push(hit)
          dot.addEventListener('click', (event) => {
            event.stopPropagation()
            handleIntersectionClick(hit)
          })
          points.push(dot)
          group.append(dot)
        }
      }
    }
  }

  svg.append(group)
  return intersections
}

let intersections = buildScene()
window.addEventListener('resize', () => {
  intersections = buildScene()
})

function handleIntersectionClick(hit) {
  const isScaleOneClick = hit.locationA.scale === 1 && hit.locationB.scale === 1

  if (isScaleOneClick) {
    const clickedColor = hit.element.getAttribute('fill')
    const isNegative = ['yellow', 'green', 'orange'].includes(clickedColor)
    const targetCenterId = thirdCircleId(
      hit.locationA.centerId,
      hit.locationB.centerId
    )
    const targetCenter = centers?.[targetCenterId]
    if (!targetCenter) {
      return
    }

    if (isNegative) {
      shiftRingForCenter(targetCenter, 1.15, -3)
    } else {
      shiftRingForCenter(targetCenter, 0.85, 3)
    }
  }

  console.log('Intersection:', {
    position: hit.position,
    locationA: hit.locationA,
    locationB: hit.locationB,
  })
}

function shiftRingForCenter(center, scale, shiftBy) {
  const ring = intersections
    .map((hit) => {
      if (
        hit.locationA.scale === scale &&
        hit.locationA.center.x === center.x &&
        hit.locationA.center.y === center.y
      ) {
        return { hit, angle: hit.locationA.angle }
      }
      if (
        hit.locationB.scale === scale &&
        hit.locationB.center.x === center.x &&
        hit.locationB.center.y === center.y
      ) {
        return { hit, angle: hit.locationB.angle }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.angle - b.angle)

  if (ring.length === 0) {
    return
  }

  const colors = ring.map((entry) => entry.hit.element.getAttribute('fill'))
  const rotated = ring.map(
    (_, index) => colors[(index - shiftBy + colors.length) % colors.length]
  )

  for (let i = 0; i < ring.length; i++) {
    ring[i].hit.element.setAttribute('fill', rotated[i])
  }
}

function thirdCircleId(aId, bId) {
  const all = ['c0', 'c1', 'c2']
  for (const id of all) {
    if (id !== aId && id !== bId) {
      return id
    }
  }
  return 'c0'
}
