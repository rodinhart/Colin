// init screen
const canvas = document.getElementById("canvas")
const g = canvas.getContext("2d")
g.fillStyle = "black"
g.fillRect(0, 0, 255, 255)

const palette = {
  Black: "#000000",
  "Dk. Gray": "#575757",
  "Lt. Gray": "#a0a0a0",
  White: "#ffffff",

  Blue: "#2a4bd7",
  Green: "#1d6914",
  Brown: "#814a19",
  Purple: "#8126c0",

  "Lt. Blue": "#9dafff",
  "Lt. Green": "#81c57a",
  Tan: "#e9debb",
  Red: "#ad2323",

  Cyan: "#29d0d0",
  Yellow: "#ffee33",
  Orange: "#ff9233",
  Pink: "#ffcdf3",
}

// build wasm
const wabt = await WabtModule()

const LINK = 0
const NAME = 1
const CODEWORD = 2
const FLAGS = 3
const PARAMS = 4

const code = await fetch("./colin.wat").then((r) => r.text())
const module = wabt.parseWat("test.wast", eval(`\`${code}\``), wabt.FEATURES)

module.resolveNames()
module.validate(wabt.FEATURES)
const binaryOutput = module.toBinary({ log: true, write_debug_names: true })
const binaryBuffer = binaryOutput.buffer
const wasm = new WebAssembly.Module(binaryBuffer)
const align = (p) => (p + 1) & ~1
const inwords = (p) => align(p) / 2
console.log(`wasm: ${inwords(binaryBuffer.length)} words`)

const mem = new WebAssembly.Memory({
  initial: 2,
  maximum: 2,
})
const wasmInstance = new WebAssembly.Instance(wasm, {
  js: {
    mem,
    log: (x) => console.log("forth says:", x),
    pix: (c, y, x) => {
      g.fillStyle = Object.values(palette)[c % 16]
      g.fillRect(x, 255 - y, 1, 1)
    },
  },
})

// init forth
const view = new Uint32Array(mem.buffer)
// header
view[0] = 1 // version
view[1] = 3 + inwords(binaryBuffer.length) // pointer to source
view[2] = 3 + inwords(binaryBuffer.length) + 0 // pointer to heap

// Forth
const str2int = (s) => s.charCodeAt(0) | (s.charCodeAt(1) << 8)

view[3] = str2int("LA")
view[4] = str2int("TE")
view[5] = str2int("ST")
view[6] = str2int("  ")
view[7] = 15 // link
view[8] = 3 // name
view[9] = 0 // codeword
view[10] = 0 // flags
view[11] = 7 // params

view[12] = str2int("HE")
view[13] = str2int("RE")
view[14] = str2int("  ")
view[15] = 0 // link
view[16] = 12 // name
view[17] = 0 // codeword
view[18] = 0 // flags
view[19] = 20 // params

const appendStr = (s) => {
  let here = view[19]

  for (let i = 0; i < s.length; i += 2) {
    view[here++] = str2int(s.slice(i, i + 2))
  }

  view[19] = here
}

const create = (name, codeword, ...params) => {
  const ptr = view[19]
  appendStr(name)

  let here = view[19]
  const latest = view[11]
  view[11] = here
  view[here++] = latest
  view[here++] = ptr
  view[here++] = codeword
  view[here++] = 0 // flags
  for (const param of params) {
    view[here++] = param
  }

  view[19] = here

  return view[11]
}

const LIT = create("LIT ", 1)
const DOT = create(". ", 2)
const EXIT = create("EXIT  ", 4)
const PLUS = create("+ ", 5)
const PIXEL = create("PIXEL ", 6)

const SOURCE = view[19]
appendStr(`LIT 100 LIT 50 LIT 11 PIXEL EXIT `)

const MAIN = create("MAIN  ", 3, LIT, 100, LIT, 50, LIT, 11, PIXEL, EXIT)

const getName = (i) => {
  const name = []
  while (i < view.length) {
    name.push(
      String.fromCharCode(view[i] & 255),
      String.fromCharCode(view[i] >> 8),
    )
    if (name.at(-1) === " ") {
      break
    }

    i++
  }

  return name.join("").trim()
}

// display dictionary
let cur = view[11]
while (cur) {
  const params = []
  if (view[cur + CODEWORD] === 3) {
    let i = cur + PARAMS
    while (i < view.length) {
      const en = view[i++]
      params.push(getName(view[en + NAME]))

      if (en === LIT) {
        params.push(view[i++])
      }

      if (en === EXIT) {
        break
      }
    }
  }

  console.log(
    getName(view[cur + NAME]),
    view[cur + CODEWORD] === 3 ? `[${params.join(" ")}]` : "",
  )

  cur = view[cur + LINK]
}

const { init, next, docol } = wasmInstance.exports

init(0, 0x3000, 0x4000) // ip, ds, sp
docol(MAIN * 4)
let max = 1000
while (max > 0 && next() !== 0) {
  max--
}
