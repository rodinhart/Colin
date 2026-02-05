// @ts-nocheck
console.clear()

const LINK = 0
const NAME = 1
const CODEWORD = 2
const FLAGS = 3
const PARAMS = 4

const LATEST = 0
const HERE = 5

const vaR = () => {
  ds.push(en + PARAMS)
}

const mem = [5, "LATEST", vaR, 0, 0, -1, "HERE", vaR, 0, 10]
let ip = -1
let en = -1
const ds = []
const sp = []

const comma = (...vals) => {
  let here = mem[HERE + PARAMS]
  for (const val of vals) {
    mem[here++] = val
  }

  mem[HERE + PARAMS] = here
}

const create = (name, codeword) => {
  const latest = mem[LATEST + PARAMS]
  const here = mem[HERE + PARAMS]
  mem[LATEST + PARAMS] = here
  comma(latest, name, codeword, 0)

  return here
}

const lit = () => {
  ds.push(mem[ip++])
}
const LIT = create("LIT", lit)

const dot = () => {
  console.log(ds.pop())
}
const DOT = create("DOT", dot)

const exit = () => {
  ip = sp.pop()
}
const EXIT = create("EXIT", exit)

const docol = () => {
  sp.push(ip)
  ip = en + PARAMS
}

const next = () => {
  en = mem[ip++]
  mem[en + CODEWORD]()
}

const dup = () => {
  ds.push(ds.at(-1))
}
const DUP = create("DUP", dup)

const mul = () => {
  ds.push(ds.pop() * ds.pop())
}
const MUL = create("MUL", mul)

// prog
const SQ = create("SQ", docol)
comma(DUP, MUL, EXIT)

const MAIN = create("MAIN", docol)
comma(LIT, 9, SQ, DOT, EXIT)

let cur = mem[LATEST + PARAMS]
while (cur !== -1) {
  const name = mem[cur + NAME]
  const codeword = mem[cur + CODEWORD]
  if (codeword !== docol) {
    console.log(name, "function")
  } else {
    let i = cur + PARAMS
    const params = []
    let j
    do {
      j = mem[i++]
      params.push(mem[j + NAME])
      if (j === LIT) {
        params.push(mem[i++])
      }
    } while (params.length < 100 && j !== EXIT)
    console.log(name, params)
  }

  cur = mem[cur + LINK]
}

ip = -1
en = MAIN
docol()

let n = 0
while (n < 1000 && ip !== -1) {
  n++
  next()
}
console.log(`ops: ${n}`)
