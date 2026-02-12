import { LINK, NAME, CODEWORD, FLAGS, PARAMS, HERE, LATEST } from "./util.js"
import hardware from "./hardware.js" // could return 64 K of memory
import loadWasm from "./wasm.js"

// helpers
const getName = (i) => {
  const name = []
  while (i < view.length) {
    const b = (i & 1) === 1 ? view[i - 1] >> 8 : view[i]
    const c = b & 255

    if (c <= 32) {
      break
    }

    name.push(String.fromCharCode(c))

    i++
  }

  return name.join("")
}

const { pixel } = hardware()

// init wasm
const { wasm, buffer: binaryBuffer } = await loadWasm()
const mem = new WebAssembly.Memory({
  initial: 2, // 128 K
  maximum: 2,
})
const wasmInstance = new WebAssembly.Instance(wasm, {
  js: {
    mem,
    log: (x) => console.log("forth says:", x),
    number: (x) => Number(getName(x)),
    pix: (c, y, x) => {
      pixel(x, y, c)
    },
  },
})
const { init, next, docol, eval: evil } = wasmInstance.exports

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

const create = (name, flags, codeword, ...params) => {
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
  view[here] = flags
  here += 2
  for (const param of params) {
    view[here] = param
    here += 2
  }

  view[38] = here

  return view[22]
}

const LIT = create("LIT ", 0, 1)
const DOT = create(". ", 0, 2)
const EXIT = create("EXIT  ", 0, 4)
const PLUS = create("+ ", 0, 5)
const PIXEL = create("PIXEL ", 0, 6)

const SOURCE = view[38]
appendStr(`100 50 15 PIXEL EXIT `)
const SOURCE_END = view[38]

const MAIN = create("MAIN  ", 0, 3)

init(0, 0x7000, 0x8000, SOURCE) // ip, ds, sp, in
evil(SOURCE_END)

docol(MAIN)
let max = 1000
while (max-- > 0 && next() !== 0) {
  //
}
console.log("Ops: ", 1000 - max)

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
