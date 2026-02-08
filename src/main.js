import './style.css'

const { atan2, cos, pow, sign, sin, sqrt, PI } = Math

const SVG_NS = 'http://www.w3.org/2000/svg'

function resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    document.querySelector('svg').setAttribute('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
}

window.addEventListener('resize', resize)
resize()

const g = document.querySelector('g')
g.setAttribute('transform', `scale(1, -1)`)

function svg(tag, setAttributes) {
    const element = document.createElementNS(SVG_NS, tag)
    Object.entries(setAttributes).forEach(([name, value]) => element.setAttribute(name, value))
    return g.appendChild(element)
}

function rad(deg) {
    return deg * PI / 180
}

function circlesIntersection({ cx: x0, cy: y0, radius: r0 }, { cx: x1, cy: y1, radius: r1 }) {
    const dx = x1 - x0
    const dy = y1 - y0
    const dd = pow(dx, 2) + pow(dy, 2)
    const d = sqrt(dd)
    const r0Squared = pow(r0, 2)
    const a = (r0Squared - pow(r1, 2) + dd) / (2 * d)
    const h = sqrt(r0Squared - pow(a, 2))
    const px = x0 + a * dx / d
    const py = y0 + a * dy / d

    return [
        px - h * dy / d,
        py + h * dx / d,
    ]
}

const faceMapping = {
    0.85: {
        0.85: [[0, -1], [1, 1]],
        1: [[0, -1], [0, 1]],
        1.15: [[1, 1], [0,  1]],
    },
    1: {
        0.85: [[1, -1], [1,  1]],
        1.15: [[1, 1], [1,  -1]],
    },
    1.15: {
        0.85: [[1, -1], [0,  -1]],
        1: [[0,  1], [0,  -1]],
        1.15: [[0,  1], [1,  -1]],
    },
}


const nodes = []
const locations = [
    { 0.85: [], 1: [], 1.15: [] },
    { 0.85: [], 1: [], 1.15: [] },
    { 0.85: [], 1: [], 1.15: [] },
]

function sliceRotate(slice, direction, speed = 3) {
    const sliceNodes = slice.map(el => nodes.find(node => node.locations.find(({ center, scale, order }) => center === el.center && scale === el.scale && order === el.order)))
    const sliceRotate = locations[slice[0].center][slice[0].scale]
        .map(el => nodes.find(node => node.locations.find(({ center, scale, order }) => center === el.center && scale === el.scale && order === el.order)))
        .map(({ locations }) => locations)

    const length = slice.length
    for (let i = 0; i < length; i++) {
        const srcLocation = sliceNodes[i].locations.find(({ center }) => center === slice[0].center)
        sliceNodes[i].stage = sliceRotate[(srcLocation.order + 12 + direction) % 12]
        const dstLocation = sliceNodes[i].stage.find(({ center }) => center === slice[0].center)
        const delta = dstLocation.angle - srcLocation.angle
        const angles = []
        for (let j = 0; j < (sign(direction) * delta + 360) % 360; j += speed) {
            angles.push((srcLocation.angle + sign(direction) * j + 360) % 360)
        }
        angles[angles.length - 1] = dstLocation.angle
        sliceNodes[i].queue.push({
            cx: srcLocation.cx,
            cy: srcLocation.cy,
            radius: srcLocation.radius,
            angles
        })
    }

    return sliceNodes
}

class Node {
    center
    color
    element
    locations = []
    queue = []
    radius
    stage
    x
    y
    constructor(circle0, circle1, color) {
        this.center = 3 - circle0.center - circle1.center
        this.color = color
        const [x, y] = circlesIntersection(circle0, circle1)
        this.x = x
        this.y = y
        this.locations.push(
            location(circle0, x, y),
            location(circle1, x, y)
        )
        locations[circle0.center][circle0.scale].push(this.locations[0])
        locations[circle1.center][circle1.scale].push(this.locations[1])
        locations.push(...this.locations)
        const element = this.element = svg('circle', { cx: x, cy: y, r: 6, fill: color, class: 'node' })
        element.addEventListener('click', this.clickHandler.bind(this, 1))
        element.addEventListener('contextmenu', this.clickHandler.bind(this, -1))
        nodes.push(this)
    }

    render() {
        const location0 = this.locations[0]
        this.center = 3 - location0.center - this.locations[1].center
        let x = location0.cx + location0.radius * sin(rad(location0.angle))
        let y = location0.cy + location0.radius * cos(rad(location0.angle))

        if (this.queue.length) {
            const frame = this.queue[0]
            const angle = frame.angles.shift()
            if (angle !== undefined) {
                x = frame.cx + frame.radius * sin(rad(angle))
                y = frame.cy + frame.radius * cos(rad(angle))
            } else {
                this.queue.shift()
            }
        }

        this.element.setAttribute('cx', x)
        this.element.setAttribute('cy', y)
    }

    clickHandler(faceDirection, e) {
        e.preventDefault()
        e.stopPropagation()
        console.log(`c: ${this.center} s0: ${this.locations[0].scale} s1: ${this.locations[1].scale}`)

        let direction = faceDirection
        let size = 0.85

        if ((this.locations[0].center - this.locations[1].center + 3) % 3 === 2) {
            direction *= -1
            size = 1.15
        }

        const slice = locations[this.center][size]
        const slicesNodes = sliceRotate(slice, direction * 3)
        slicesNodes.forEach(node => node.locations = node.stage)

        const faceNodes = nodes.filter(({ locations }) => locations[0].center === this.locations[0].center && locations[1].center === this.locations[1].center)
        console.log(faceNodes)
        faceDirection = faceDirection === 1 ? 0 : 1
        for (let i = 0; i < 2; i++) {
            const stagedNodes = []
            for (const node of faceNodes) {
                if (node.locations[0].scale === 1 && node.locations[1].scale === 1) {
                    continue
                }
                const params = faceMapping[node.locations[0].scale][node.locations[1].scale][faceDirection]
                const srcLocation = node.locations[params[0]]
                const slice = [srcLocation]
                stagedNodes.push(...sliceRotate(slice, params[1], 0.7))
            }
            stagedNodes.forEach(node => node.locations = node.stage)
        }
    }
}

const base = 60
const radius = sqrt(3) * base
const scales = [0.85, 1, 1.15]

const centers = [
    { cx: base * sin(rad(0)), cy: base * cos(rad(0)) },
    { cx: base * sin(rad(120)), cy: base * cos(rad(120)) },
    { cx: base * sin(rad(240)), cy: base * cos(rad(240)) }
]

function circle(center, scale) {
    return { ...centers[center], center, scale, radius: radius * scale }
}

function location(circle, x, y) {
    return {
        ...circle,
        angle: (atan2(x - circle.cx, y - circle.cy) * 180 / PI + 360) % 360
    }
}

for (const { cx, cy } of centers) {
    for (const scale of scales) {
        svg('circle', { cx, cy, r: radius * scale, class: 'orbit' })
    }
}

for (const [c0, c1, color] of [
    [0, 2, 'blue'],
    [2, 0, 'green'],

    [2, 1, 'white'],
    [1, 2, 'yellow'],

    [1, 0, 'red'],
    [0, 1, 'orange'],
]) {
    for (const s0 of scales) {
        for (const s1 of scales) {
            new Node(circle(c0, s0), circle(c1, s1), color)
        }
    }
}

for (let c = 0; c < centers.length; c++) {
    for (const s of scales) {
        locations[c][s].sort((a, b) => a.angle - b.angle)
        locations[c][s].forEach((el, i) => el.order = i)
    }
}

setInterval(() => {
    nodes.forEach(node => node.render())
}, 25)
