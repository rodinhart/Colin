// https://ditherit.com/
// [{"hex":"#000000"},{"hex":"#575757"},{"hex":"#a0a0a0"},{"hex":"#ffffff"},{"hex":"#2a4bd7"},{"hex":"#1d6914"},{"hex":"#814a19"},{"hex":"#8126c0"},{"hex":"#9dafff"},{"hex":"#81c57a"},{"hex":"#e9debb"},{"hex":"#ad2323"},{"hex":"#29d0d0"},{"hex":"#ffee33"},{"hex":"#ff9233"},{"hex":"#ffcdf3"}]

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

for (const [name, hex] of Object.entries(palette)) {
  const div = document.createElement("div")
  div.style.backgroundColor = hex
  div.title = name
  document.getElementById("palette").appendChild(div)
}

// init screen
const canvas = document.getElementById("canvas")
const g = canvas.getContext("2d")
g.fillStyle = "black"
g.fillRect(0, 0, 255, 255)

// Forth constants
const LINK = 0
const NAME = 2
const CODEWORD = 4
const FLAGS = 6
const PARAMS = 8

// build wasm
const wabt = await WabtModule()
const code = await fetch("./colin.wat").then((r) => r.text())
const module = wabt.parseWat("test.wast", eval(`\`${code}\``), wabt.FEATURES)

module.resolveNames()
module.validate(wabt.FEATURES)
const binaryOutput = module.toBinary({ log: true, write_debug_names: true })
const binaryBuffer = binaryOutput.buffer
const wasm = new WebAssembly.Module(binaryBuffer)
console.log(`wasm: ${binaryBuffer.length} bytes`)

const mem = new WebAssembly.Memory({
  initial: 2, // 128 KB
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
const { init, next, docol } = wasmInstance.exports

// init forth
const align = (p) => (p + 1) & ~1

const view = new Uint16Array(mem.buffer)
// header
view[0] = 1 // version
view[2] = 6 + align(binaryBuffer.length) // pointer to source
view[4] = 6 + align(binaryBuffer.length) + 0 // pointer to heap

// Forth
const str2int = (s) => s.charCodeAt(0) | (s.charCodeAt(1) << 8)

view[6] = str2int("LA")
view[8] = str2int("TE")
view[10] = str2int("ST")
view[12] = str2int("  ")
view[14] = 30 // link
view[16] = 6 // name
view[18] = 0 // codeword
view[20] = 0 // flags
view[22] = 14 // params

view[24] = str2int("HE")
view[26] = str2int("RE")
view[28] = str2int("  ")
view[30] = 0 // link
view[32] = 24 // name
view[34] = 0 // codeword
view[36] = 0 // flags
view[38] = 40 // params

const appendStr = (s) => {
  let here = view[38]

  for (let i = 0; i < s.length; i += 2) {
    view[here] = str2int(s.slice(i, i + 2))
    here += 2
  }

  view[38] = here
}

const create = (name, codeword, ...params) => {
  const ptr = view[38]
  appendStr(name)

  let here = view[38]
  const latest = view[22]
  view[22] = here
  view[here] = latest
  here += 2
  view[here] = ptr
  here += 2
  view[here] = codeword
  here += 2
  view[here] = 0 // flags
  here += 2
  for (const param of params) {
    view[here] = param
    here += 2
  }

  view[38] = here

  return view[22]
}

const LIT = create("LIT ", 1)
const DOT = create(". ", 2)
const EXIT = create("EXIT  ", 4)
const PLUS = create("+ ", 5)
const PIXEL = create("PIXEL ", 6)

const SOURCE = view[38]
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

    i += 2
  }

  return name.join("").trim()
}

// display dictionary
let cur = view[22]
while (cur) {
  const params = []
  if (view[cur + CODEWORD] === 3) {
    let i = cur + PARAMS
    while (i < view.length) {
      const en = view[i]
      i += 2
      params.push(getName(view[en + NAME]))

      if (en === LIT) {
        params.push(view[i])
        i += 2
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

init(0, 0x6000, 0x8000) // ip, ds, sp
docol(MAIN * 2)
let max = 1000
while (max > 0 && next() !== 0) {
  max--
}
