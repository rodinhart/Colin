# Colin

An playground forth, implemented in JavaScript first to tease out the structure. The idea is then to port it to somewhere very low level, like the ARM2 (RISC-OS 3), 6502 (BBC Micro) or WebAssembly.

Although the forth words used are kept as close as possible to the Forth Standard (2012), Colin overall semantics are completely different. Most notably, everything in Colin is compiled. There is no interpreter mode, although there are immediate words. For example

```forth
5 < IF "lo" ELSE "hi" THEN
```

is compiled to temporary memory before being executed using `DOCOL`. This simplifies the mental model, immediate words like `IF` are directly usable in the REPL, not just when defining another word. This should not (hopefully) reduce the extensibility of forth.

# Notes

## Immediate words

When in compilation mode, everything encountered is added to the memory pointed to by HERE. In order to escape compilation mode (or do something meta) some words need to be marked as immediate.

## Branching only works in definitions

Branching manipulated the instruction pointer, which is only available when compiled code is run; the interpreter has no instruction pointer.

## Primitives

```
HERE
@
!
LATEST

IP
>R
INDIRECT
```

## Core

```
: COMMA HERE @ !  HERE @ 1 + HERE !
: DOCOL IP @ >R  INDIRECT @ 1 + IP ! NEXT ;
: NEXT
```
