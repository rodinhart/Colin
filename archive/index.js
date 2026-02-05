import Forth from "./colin.js"

const SCALE = 2
const canvas = document.createElement("canvas")
canvas.width = SCALE * 256
canvas.height = SCALE * 256
document.body.appendChild(canvas)
const g = canvas.getContext("2d")

const CLS = () => {
  g.fillStyle = "black"
  g.fillRect(0, 0, SCALE * 256, SCALE * 256)
}

const PIXEL = (x, y, col) => {
  const rgb = [(col >>> 0) & 3, (col >>> 2) & 3, (col >>> 4) & 3].map((c) =>
    ("0" + (85 * c).toString(16)).slice(-2),
  )
  g.fillStyle = `#${rgb.join("")}`
  g.fillRect(SCALE * (x % 256), SCALE * (y % 256), SCALE, SCALE)
}

const PRN = (v) => {
  console.log(v)
}

const WAIT = () =>
  new Promise((res) => {
    requestAnimationFrame(() => {
      res()
    })
  })

const forth = Forth({ CLS, PIXEL, PRN, WAIT })
await forth.eval(await fetch("./index.f").then((r) => r.text()))

/*

0 BEGIN DUP 8 < WHILE
  0 BEGIN DUP 8 < WHILE
    DUP  2 PICK  DUP 8 * 2 PICK + PIXEL
    1 +
  REPEAT DROP
  1 +
REPEAT DROP

*/

const DEBUG = false

if (DEBUG) {
  const BASE = 138
  console.log(
    forth
      .memory()
      .slice(BASE)
      .map(
        (x, a) =>
          `${BASE + a}: ${x}${
            typeof forth.memory()[x - 1] === "string"
              ? ` (${forth.memory()[x - 1]})`
              : ""
          }`,
      )
      .join("\n"),
  )
}

console.log(forth.data())
