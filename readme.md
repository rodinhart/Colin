# Colin

An playground forth, implemented in JavaScript first to tease out the structure. The idea is then to port it to somewhere very low level, like the ARM2 (RISC-OS 3), 6502 (BBC Micro) or WebAssembly.

Although the forth words used are kept as close as possible to the Forth Standard (2012), Colin overall semantics are completely different. Most notably, everything in Colin is compiled. There is no interpreter mode, although there are immediate words. For example

```forth
5 < IF "lo" ELSE "hi" THEN
```

is compiled to temporary memory before being executed using `DOCOL`. This simplifies the mental model, immediate words like `IF` are directly usable in the REPL, not just when defining another word. This should not (hopefully) reduce the extensibility of forth.

## Notes

### Immediate words

When in compilation mode, everything encountered is added to the memory pointed to by HERE. In order to escape compilation mode (or do something meta) some words need to be marked as immediate.

### Branching only works in definitions

Branching manipulated the instruction pointer, which is only available when compiled code is run; the interpreter has no instruction pointer.

### Primitives

```
HERE
@
!
LATEST

IP
>R
INDIRECT
```

### Core

```
: COMMA HERE @ !  HERE @ 1 + HERE !
: DOCOL IP @ >R  INDIRECT @ 1 + IP ! NEXT ;
: NEXT
```

## More complete description

Forth code consists of a sequence of words and values. For example

```fs
1 2 +
```

will push 1 and 2 onto the stack. The `+` operator will take two numbers from the stack, add them and push the result onto the stack.

Forth code is compiled, then executed. Our example might compile to

```fs
LIT 1 LIT 2 +
```

as a series of code words and values. Execution of `LIT` will push the next value `1` onto the stack. Execution of `+` will perform the addition. A code word is merely a pointer to a subroutine. This subroutine can be a primitive like `+`, or a word defined in term of other words. In this case the codeword also carries the compilation of those words to be executed by the subroutine.

The subroutine that executes another sequence of code words is traditionally called `DOCOL` because words are defined using a colon. For example

```fs
: SQ DUP * ;
```

will define a word `SQ` that will duplicate the top of the stack, and multiply the top two numbers on the stack, thus squaring a number. The `:` word will create a new record named `SQ` and compile the in put up to `;`. Most words will compile to their codeword, and literals, like numbers compile to `Lit <n>`.

Forth keeps a linked list of records, each record representing a word. A record might look like

```
link
flags
name
codeword
params
```

The link field points to the next record in the linked list. Flags can indicate whether the word is immediate (explained later) or internal. The name field should be obvious. The codeword points to a subroutine as we saw, either a primitive or
`DOCOL`.

Forth has named variables, words that when called push a pointer to storage onto the stack. The storage can then be read and written using `@` and `!` respectively. New variables can be created using `VARIABLE <name>` which will allocate a single storage cell. Storage can be increased using `ALLOT <n>`.

Forth has two important built-in variables. `LATEST` hold the last recorded word, hence the start of the linked list of records. `HERE` holds the next free cell, and therefore tracks where compilation takes place. As `HERE` is available to the programmer, the compiler may be influenced, similar to lisp macros. In fact as we shall see. construct such as `IF ELSE THEN` are implemented this way.

Forth allows words to be flagged as immediate. When an immediate is encountered during compilation, it is executed, not compiled. Because forth provides access to some of the internal these immediate words can direct compilation. Define `:` for example immediatly creates a new named record. Compilation then continues into that record until another immediate `;` is encountered, which appends `EXIT` so the compiled word acts as a subroutine.

Another example is `IF`

```fs
: IF IMMEDIATE ' 0BRANCH , HERE @ 0 , ;
```

This defines it as an immediate word that adds the codeword for
branch-is-zero word
(`' 0BRANCH ,`), pushes the current compilation location to the stack (`HERE @`), and adds zero (`0 ,`). Note that the top of the stack now points to where the offset for the branch is stored. This means that when `THEN` is encountered and the end of the consequence is known, the offset can be patched with the real offset:

```fs
: THEN IMMEDIATE  ( addr )
  DUP HERE @ SWAP -  ( addr offset )
  SWAP ! ;  ( )
```

## Forth in Forth

```fs
: NEXT [ASM
  LDA %ip
  ORA %ip + 1
  BEQ rtsHost%

  LDY #0
  LDA (ip%), Y
  STA codeword%
  INY
  LDA (ip%), Y
  STA codeword% + 1

  LDA #2
  CLC
  ADC ip%
  STA ip%
  LDA #0
  ADC ip% + 1
  STA ip% + 1

  LDY #0
  LDA (codeword%), Y
  STA temp%
  INY
  LDA (codeword%), Y
  STA temp% + 1
  JMP (temp%)
.rtsHost%
  RTS
]

: @ [ASM
  LDA sp% - 1, X
  STA temp%
  LDA sp% + 255, X
  STA temp% + 1
  LDY #0
  LDA (temp%), Y
  STA sp% - 1
  INY
  LDA (temp%), Y
  STA sp% + 255, X
  JMP NEXT%
]

: ! [ASM
  DEX
  LDA sp%, X
  STA temp%
  LDA sp% + 256, X
  STA temp% + 1
  DEX
  LDA sp%, X
  LDY #0
  STA (temp%), Y
  LDA sp% + 256, X
  INY
  STA (temp%), Y
  JMP NEXT%
]

: , HERE @ !
  HERE @ 1 + HERE ! ;

: IF IMMEDIATE
  ' 0BRANCH , HERE @ 0 , ;

: THEN IMMEDIATE
  DUP HERE @ SWAP -
  SWAP ! ;


```

# ARM Forth, or fantasy console

## TODO

- should fetch/store operate on word index, not byte index?

## Forth explained, again

Forth is a stack based, concatenative language. The source code comprises words that operate on the stack, and other parts of the runtime.

```forth
8 DUP * .
```

In the above example, `8` pushes the number eight on the stack, `DUP` duplicates to top element of the stack (so now there are two eights on the stack), and `*` takes the top two elements, multiplies them, and puts the result on the stack. Finally, `.` prints takes the top element and prints it.

Words are defined in a dictionary, traditionally implemented as a linked list. Each definition contains information such as the word (e.g. `DUP`), a pointer to the code, any parameters, and some flags.

The Forth compiler reads the words one at a time, and takes some action depending on the type of word. In pseudo code:

```
while WORD
  if lookup WORD
    if lookup WORD is immediate
      execute lookup WORD
    else
      append lookup WORD
  else
    if lookup WORD is number
      append LIT number
    else
      signal error
```

Let's step through this with a simple example:

```forth
: SQ DUP * ;
```

`:` A word called 'colon' which has the immediate flag set, meaning it will be executed straight away. Colon will read the next word (`SQ`) and create a new dictionary definition for that name. The code for this definition is `docol` which will execute a list compiled words stored in the parameter space. Any following compilation will be placed in this space.

`DUP` This is not an immediate word so a pointer to the dictionary definition will be appended at the current position (the params space for `SQ`).

`*` Another regular word, so again, appended.

`;` Semicolon, another immediate word. When executed it will finalize the definition for `SQ` by appending a pointer to `EXIT`. When `SQ` is executed, `EXIT` will return to the caller.
