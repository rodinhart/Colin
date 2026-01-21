(module
  (memory (import "js" "mem") 1)
  (func $log (import "js" "log") (param i32))

  (global $ip (mut i32) (i32.const 0))
  (global $ds (mut i32) (i32.const 0))
  (global $sp (mut i32) (i32.const 0))

  (type $native (func (param i32)))
  (table 16 funcref)
  (elem (i32.const 0) $var)
  (elem (i32.const 1) $lit)
  (elem (i32.const 2) $dot)
  (elem (i32.const 3) $docol)

  (func $var (param i32)
    global.get $ds ;; push pointer to params
    local.get 0
    i32.const ${PARAMS * 4}
    i32.add
    i32.store

    global.get $ds ;; increment ds
    i32.const 4
    i32.add
    global.set $ds
  )

  (func $lit (param i32)
    global.get $ds
    global.get $ip ;; load value from ip
    i32.load
    i32.store ;; push value
    global.get $ds

    i32.const 4 ;; increment ds
    i32.add
    global.set $ds

    global.get $ip ;; increment ip
    i32.const 4
    i32.add
    global.set $ip
  )

  (func $dot (param i32)
    global.get $ds ;; decrease ds
    i32.const 4
    i32.sub
    global.set $ds

    global.get $ds ;; pop value
    i32.load
    call $log
  )

  (func $docol (export "docol") (param i32))

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

  (func (export "next")
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
  )
)
