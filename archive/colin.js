const Forth = (externals = {}) => {
  // struct constants
  const LINK = 0
  const FLAGS = 1
  const NAME = 2
  const CODEWORD = 3
  const PARAMS = 4

  const NONE = 0
  const IMMEDIATE = 1
  const HIDDEN = 2

  // machine
  let ip = null
  let indirect = null

  // memory
  const _variable = async () => {
    push(indirect + 1)
    await NEXT()
  }
  const memory = [
    null, // link
    NONE, // flags
    "HERE", // name
    _variable, // codeword
    10, // params

    0,
    NONE,
    "LATEST",
    _variable,
    5,
  ]

  // indirect threaded code
  let safety
  const NEXT = async () => {
    if (ip === null) {
      return
    }

    if (performance.now() >= safety + 10000) {
      // throw new Error(`Timeout!`)
    }

    indirect = memory[ip++]
    await memory[indirect]()
  }

  // parameter/data stack
  let sp = 1000
  const pop = () => memory[--sp]
  const push = (v) => (memory[sp++] = v)
  const peek = () => memory[sp - 1]

  // return stack
  let rSp = sp + 1000
  const rPop = () => memory[--rSp]
  const rPush = (v) => (memory[rSp++] = v)

  // input
  let s = null
  let i = 0

  // bootstrap
  const _comma = (val) => {
    memory[memory[0 + PARAMS]++] = val
  }

  const _create = () => {
    const word = _word()
    const latest = memory[5 + PARAMS]
    memory[5 + PARAMS] = memory[0 + PARAMS] // HERE @ LATEST !
    _comma(latest)
    _comma(NONE)
    _comma(word)
  }

  const _docol = async () => {
    rPush(ip)
    ip = indirect + 1
    await NEXT()
  }

  const _find = (word, all) => {
    let ptr = memory[5 + PARAMS]
    while (ptr !== null) {
      if (
        (all || (memory[ptr + FLAGS] & HIDDEN) === 0) &&
        memory[ptr + NAME] === word
      ) {
        break
      }

      ptr = memory[ptr + LINK]
    }

    return ptr
  }

  const _word = () => {
    while (i < s.length && s[i] <= " ") i++
    const t = i
    while (i < s.length && s[i] > " ") i++

    return i === t ? null : s.substring(t, i)
  }

  // add to dictionary
  ;[
    [
      "!",
      async () => {
        memory[pop()] = pop()
        await NEXT()
      },
    ],
    [
      ["'", IMMEDIATE],
      async () => {
        const word = _word()
        _comma(_find("LIT", true) + CODEWORD)
        _comma(_find(word) + CODEWORD)
        await NEXT()
      },
    ],
    [
      ["(", IMMEDIATE],
      async () => {
        while (i < s.length && s[i] !== ")") i++
        i++
        await NEXT()
      },
    ],
    [
      "*",
      async () => {
        push(pop() * pop())
        await NEXT()
      },
    ],
    [
      "+",
      async () => {
        push(pop() + pop())
        await NEXT()
      },
    ],
    [
      ",",
      async () => {
        _comma(pop())
        await NEXT()
      },
    ],
    [
      "-",
      async () => {
        const b = pop()
        const a = pop()
        push(a - b)
        await NEXT()
      },
    ],
    [
      [":", IMMEDIATE],
      async () => {
        _create()
        _comma(_docol)
        await NEXT()
      },
    ],
    [
      ["VARIABLE", IMMEDIATE],
      async () => {
        _create()
        _comma(_variable)

        pop() // discard old compilation
        // push new compilation
        push(memory[0 + PARAMS])
        await NEXT()
      },
    ],
    [
      ["ALLOT", IMMEDIATE],
      async () => {
        const n = pop()
        for (let j = 0; j < n; j++) {
          _comma(0)
        }

        pop() // discard old compilation
        // push new compilation
        push(memory[0 + PARAMS])
        await NEXT()
      },
    ],
    [
      [";", IMMEDIATE],
      async () => {
        _comma(_find("EXIT", true) + CODEWORD)

        pop() // discard old compilation
        // push new compilation
        push(memory[0 + PARAMS])
        await NEXT()
      },
    ],
    [
      "<",
      async () => {
        const b = pop()
        const a = pop()
        push(a < b ? 1 : 0)
        await NEXT()
      },
    ],
    [
      "@",
      async () => {
        push(memory[pop()])
        await NEXT()
      },
    ],
    [
      "BRANCH",
      async () => {
        const offset = memory[ip++]
        ip += offset - 1
        await NEXT()
      },
    ],
    [
      "0BRANCH",
      async () => {
        const offset = memory[ip++]
        if (pop() === 0) {
          ip += offset - 1
        }
        await NEXT()
      },
    ],
    ["DOCOL", _docol],
    [
      "DROP",
      async () => {
        pop()
        await NEXT()
      },
    ],
    [
      "DUP",
      async () => {
        push(peek())
        await NEXT()
      },
    ],
    [
      ["EXIT", HIDDEN],
      async () => {
        ip = rPop()
        await NEXT()
      },
    ],
    [
      ["IMMEDIATE", IMMEDIATE],
      async () => {
        memory[memory[0 + PARAMS] - 3] |= IMMEDIATE
        await NEXT()
      },
    ],
    [
      ["LIT", HIDDEN],
      async () => {
        push(memory[ip++])
        await NEXT()
      },
    ],
    [
      "OVER",
      async () => {
        push(memory[sp - 2])
        await NEXT()
      },
    ],
    [
      "PICK",
      async () => {
        const arg = pop()
        push(memory[sp - 1 - arg])
        await NEXT()
      },
    ],
    [
      "RAND",
      async () => {
        push(Math.floor(pop() * Math.random()))
        await NEXT()
      },
    ],
    [
      "SWAP",
      async () => {
        const b = pop()
        const a = pop()
        push(b)
        push(a)
        await NEXT()
      },
    ],
    [
      "WORD",
      async () => {
        push(_word())
        await NEXT()
      },
    ],
    ...Object.entries(externals).map(([word, native]) => [
      word,
      async () => {
        const args = []
        for (let i = 0; i < native.length; i++) {
          args.push(pop())
        }

        await native(...args.reverse())
        await NEXT()
      },
    ]),
  ].forEach(([rawWord, codeword]) => {
    const [word, flags] = Array.isArray(rawWord) ? rawWord : [rawWord, NONE]

    const latest = memory[5 + PARAMS]
    memory[5 + PARAMS] = memory[0 + PARAMS] // HERE @ LATEST !
    _comma(latest)
    _comma(flags)
    _comma(word)
    _comma(codeword)
  })

  const _compile = () => {
    while (true) {
      const word = _word()
      if (word !== null) {
        const ptr = _find(word)
        if (ptr !== null) {
          if ((memory[ptr + FLAGS] & IMMEDIATE) === 0) {
            _comma(ptr + CODEWORD)
          } else {
            indirect = ptr + CODEWORD
            memory[indirect]()
          }
        } else {
          if (String(Number(word)) !== word) {
            throw new Error(`Unknown word ${word}`)
          }

          _comma(_find("LIT", true) + CODEWORD)
          _comma(Number(word))
        }
      } else {
        _comma(_find("EXIT", true) + CODEWORD)
        break
      }
    }
  }

  return {
    data: () => memory.slice(1000, sp),

    eval: async (input) => {
      s = input
      i = 0
      // push where we are compiling on the stack
      push(memory[0 + PARAMS]) // HERE @
      _compile()
      indirect = pop() - 1
      safety = performance.now()
      await _docol()
    },

    memory: () => memory.slice(0, memory[4]),
  }
}

export default Forth
