import './style.css'

const { PI, sin, cos, sqrt, pow } = Math

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight

const canvas = document.querySelector('canvas')
canvas.width = WIDTH
canvas.height = HEIGHT

const ctx = canvas.getContext("2d")

function rad(deg) {
    return deg / 180 * PI
}

function intersect(x1, y1, r1, x2, y2, r2) {
    const dd = pow(x2 - x1, 2) + pow(y2 - y1, 2)
    const d = sqrt(dd)
    const a = (pow(r1, 2) - pow(r2, 2) + dd) / (2 * d)
    const h = sqrt(pow(r1, 2) - pow(a, 2))
    const px = x1 + a * (x2 - x1) / d
    const py = y1 + a * (y2 - y1) / d

    return [px - h * (y2 - y1) / d, py + h * (x2 - x1) / d, px + h * (y2 - y1) / d, py - h * (x2 - x1) / d]
}

function draw() {
    const base = 100
    const x0 = 0
    const y0 = base
    const x1 = base * sin(rad(120))
    const y1 = base * cos(rad(120))
    const x2 = base * sin(rad(240))
    const y2 = base * cos(rad(240))

    const r = base * sqrt(3)
    for (const scale of [0.85, 1, 1.15]) {
        const radius = r * scale

        ctx.beginPath()
        ctx.arc(x0, y0, radius, 0, 2 * PI)
        ctx.strokeStyle = 'black'
        ctx.stroke()

        ctx.save()
        ctx.beginPath()
        ctx.arc(x1, y1, radius, 0, 2 * PI)
        ctx.strokeStyle = 'black'
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(x2, y2, radius, 0, 2 * PI)
        ctx.strokeStyle = 'black'
        ctx.stroke()
        ctx.restore()
    }

    for (const [x3, y3, x4, y4, color] of [
        [x2, y2, x1, y1, 'white'],
        [x1, y1, x0, y0, 'red'],
        [x0, y0, x2, y2, 'blue'],
        [x0, y0, x1, y1, 'orange'],
        [x2, y2, x0, y0, 'green'],
        [x1, y1, x2, y2, 'yellow'],
    ]) {
        for (const r3 of [r*0.85, r, r*1.15]) {
            for (const r4 of [r*0.85, r, r*1.15]) {
                const [x, y] = intersect(x3, y3, r3, x4, y4, r4)
                ctx.beginPath()
                ctx.arc(x, y, 10, 0, 2 * PI)
                ctx.fillStyle = color
                ctx.strokeStyle = 'grey'
                ctx.stroke()
                ctx.fill()
            }
        }
    }
}

window.setTimeout(() => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.save()
    ctx.translate(WIDTH / 2, HEIGHT / 2)
    ctx.scale(1, -1)
    draw()
    ctx.restore()
}, 1000 / 25)

