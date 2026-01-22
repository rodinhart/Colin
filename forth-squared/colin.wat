(module
  (memory (import "js" "mem") 1)
  (func $log (import "js" "log") (param i32))
  (func $pix (import "js" "pix") (param i32) (param i32) (param i32))

  (global $ip (mut i32) (i32.const 0))
  (global $ds (mut i32) (i32.const 0))
  (global $sp (mut i32) (i32.const 0))

  (type $native (func (param i32)))
  (table 16 funcref)
  (elem (i32.const 0) $var)
  (elem (i32.const 1) $lit)
  (elem (i32.const 2) $dot)
  (elem (i32.const 3) $docol)
  (elem (i32.const 4) $exit)
  (elem (i32.const 5) $plus)
  (elem (i32.const 6) $pixel)

  (func $var (param $en i32)
    global.get $ds ;; decrement ds
    i32.const 4
    i32.sub
    global.set $ds

    global.get $ds ;; push pointer to params
    local.get $en
    i32.const ${PARAMS * 4}
    i32.add
    i32.store
  )

  (func $lit (param $en i32)
    global.get $ds ;; decrement ds
    i32.const 4
    i32.sub
    global.set $ds

    global.get $ds
    global.get $ip ;; load value from ip
    i32.load
    i32.store ;; push value

    global.get $ip ;; increment ip
    i32.const 4
    i32.add
    global.set $ip
  )

  (func $dot (param $en i32)
    global.get $ds ;; pop value
    i32.load
    call $log

    global.get $ds ;; increment ds
    i32.const 4
    i32.add
    global.set $ds
  )

  (func $docol (export "docol") (param $en i32)
    global.get $sp ;; decrement sp
    i32.const 4
    i32.sub
    global.set $sp

    global.get $sp
    global.get $ip ;; push ip to call stack
    i32.store

    local.get $en ;; point ip to compiled words
    i32.const ${PARAMS * 4}
    i32.add
    global.set $ip
  )

  (func $exit (param $en i32)
    global.get $sp ;; pop ip
    i32.load
    global.set $ip

    global.get $sp ;; increment sp
    i32.const 4
    i32.add
    global.set $sp
  )

  (func $plus (param $en i32)
    (local $t i32)
  
    global.get $ds ;; pop value
    i32.load

    global.get $ds ;; increment ds
    i32.const 4
    i32.add
    global.set $ds

    global.get $ds ;; get value
    i32.load

    i32.add
    local.set $t

    global.get $ds ;; set result
    local.get $t
    i32.store
  )

  (func $pixel (param $en i32)
    global.get $ds ;; get c
    i32.load

    global.get $ds ;; increment ds
    i32.const 4
    i32.add
    global.set $ds

    global.get $ds ;; get y
    i32.load

    global.get $ds ;; increment ds
    i32.const 4
    i32.add
    global.set $ds

    global.get $ds ;; get x
    i32.load

    global.get $ds ;; increment ds
    i32.const 4
    i32.add
    global.set $ds

    call $pix
  )

  (func $init (export "init") (param $ip i32) (param $ds i32) (param $sp i32)
    local.get $ip
    i32.const 2
    i32.shl
    global.set $ip

    local.get $ds
    i32.const 2
    i32.shl
    global.set $ds

    local.get $sp
    i32.const 2
    i32.shl
    global.set $sp
  )

  (func (export "next") (result i32)
    (local $en i32)

    global.get $ip ;; load pointer to word
    i32.load
    i32.const 2
    i32.shl

    global.get $ip ;; increment ip
    i32.const 4
    i32.add
    global.set $ip

    local.tee $en ;; call word with en
    local.get $en
    i32.const ${CODEWORD * 4}
    i32.add
    i32.load
    call_indirect (type $native)

    global.get $ip
    i32.const 2
    i32.shr_u
  )
)
