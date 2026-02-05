import { LINK, NAME, CODEWORD, FLAGS, PARAMS, HERE, LATEST } from "./util.js"

export default async () => {
  const wabt = await WabtModule()
  const code = await fetch("./colin.wat").then((r) => r.text())
  const module = wabt.parseWat("test.wast", eval(`\`${code}\``), wabt.FEATURES)

  module.resolveNames()
  module.validate(wabt.FEATURES)
  const binary = module.toBinary({ log: true, write_debug_names: true })
  const buffer = binary.buffer
  const wasm = new WebAssembly.Module(buffer)
  console.log(`wasm: ${buffer.length} bytes`)

  return { wasm, buffer }
}
