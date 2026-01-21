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
  js: { mem, log: console.log },
})

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

const create = (name, codeword, ...params) => {
  let here = view[19]
  const ptr = here
  for (let i = 0; i < name.length; i += 2) {
    view[here++] = str2int(name.slice(i, i + 2))
  }

  const latest = view[11]
  view[11] = here
  view[here++] = latest
  view[here++] = ptr
  view[here++] = codeword
  for (const param of params) {
    view[here++] = param
  }

  view[19] = here

  return view[11]
}

create("LIT ", 1)
const DOT = create(". ", 2)
// const MAIN = create("MAIN  ", 3, )

// display dictionary
let cur = view[11]
while (cur) {
  const name = []
  let i = view[cur + NAME]
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

  console.log(name.join("").trim())

  cur = view[cur + LINK]
}

const { init, next, docol } = wasmInstance.exports

view[view[19]] = DOT
view[0x2fff] = 42
init(0, 0x2fff, 0x4000) // ip, ds, sp
docol((view[19] - PARAMS) * 4)
next()
