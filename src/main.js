import './style.css'

const { PI, sin, cos, sqrt, pow } = Math
const SVG_NS = 'http://www.w3.org/2000/svg'
const CLICK_THRESHOLD = 18

const svg = document.querySelector('#scene')

class CircleLocation {
  constructor(center, radius, angle) {
    this.center = center
    this.radius = radius
    this.angle = angle
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

function toSceneCoords(event) {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const matrix = svg.getScreenCTM()
  if (!matrix) {
    return { x: 0, y: 0 }
  }
  const svgPoint = point.matrixTransform(matrix.inverse())
  return { x: svgPoint.x, y: -svgPoint.y }
}

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
  const pairs = [
    [x2, y2, x1, y1, 'white'],
    [x1, y1, x0, y0, 'red'],
    [x0, y0, x2, y2, 'blue'],
    [x0, y0, x1, y1, 'orange'],
    [x2, y2, x0, y0, 'green'],
    [x1, y1, x2, y2, 'yellow'],
  ]

  for (const [x3, y3, x4, y4, color] of pairs) {
    for (const r3 of scales.map((s) => r * s)) {
      for (const r4 of scales.map((s) => r * s)) {
        const [x, y] = intersect(x3, y3, r3, x4, y4, r4)
        const dot = svgEl('circle', {
          cx: x,
          cy: y,
          r: 10,
          class: 'node',
          fill: color,
          stroke: 'grey',
        })
        const position = { x, y }
        const locationA = new CircleLocation(
          { x: x3, y: y3 },
          r3,
          angleFrom({ x: x3, y: y3 }, position)
        )
        const locationB = new CircleLocation(
          { x: x4, y: y4 },
          r4,
          angleFrom({ x: x4, y: y4 }, position)
        )
        intersections.push(new Intersection(position, locationA, locationB, dot))
        points.push(dot)
        group.append(dot)
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

svg.addEventListener('click', (event) => {
  const { x, y } = toSceneCoords(event)
  let closest = null
  let closestDist = Infinity

  for (const hit of intersections) {
    const dx = x - hit.position.x
    const dy = y - hit.position.y
    const dist = sqrt(dx * dx + dy * dy)
    if (dist < closestDist) {
      closestDist = dist
      closest = hit
    }
  }

  if (closest && closestDist <= CLICK_THRESHOLD) {
    console.log('Intersection:', {
      position: closest.position,
      locationA: closest.locationA,
      locationB: closest.locationB,
    })
  }
})
