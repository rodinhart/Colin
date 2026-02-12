(module
  (memory (import "js" "mem") 1)
  (func $log (import "js" "log") (param i32))
  (func $number (import "js" "number") (param i32) (result i32))
  (func $pix (import "js" "pix") (param i32) (param i32) (param i32))

  (global $ip (mut i32) (i32.const 0)) ;; instruction pointer
  (global $ds (mut i32) (i32.const 0)) ;; data stack
  (global $sp (mut i32) (i32.const 0)) ;; call stack
  (global $in (mut i32) (i32.const 0)) ;; stdin

  (func $storeWord (param $val i32) (param $ptr i32)
    local.get $ptr
    i32.const 1
    i32.shl
    local.get $val
    i32.store
  )

  (func $loadWord (param $ptr i32) (result i32)
    local.get $ptr
    i32.const 1
    i32.shl
    i32.load
  )

  (func $push (param $val i32)
    global.get $ds ;; decrement ds
    i32.const 2
    i32.sub
    global.set $ds

    local.get $val ;; store value
    global.get $ds
    call $storeWord
  )

  (func $pop (result i32)
    global.get $ds ;; load value
    call $loadWord

    global.get $ds ;; increment ds
    i32.const 2
    i32.add
    global.set $ds
  )

  (func $rpush (param $val i32)
    global.get $sp ;; decrement sp
    i32.const 2
    i32.sub
    global.set $sp

    local.get $val ;; store value
    global.get $sp
    call $storeWord
  )

  (func $rpop (result i32)
    global.get $sp ;; load value
    call $loadWord

    global.get $sp ;; increment ds
    i32.const 2
    i32.add
    global.set $sp
  )

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
    local.get $en ;; pointer to params
    i32.const ${PARAMS}
    i32.add
    call $push
  )

  (func $lit (param $en i32)
    global.get $ip ;; load value from ip and push
    call $loadWord
    call $push

    global.get $ip ;; increment ip
    i32.const 2
    i32.add
    global.set $ip
  )

  (func $dot (param $en i32)
    call $pop ;; pop value and print
    call $log
  )

  (func $docol (export "docol") (param $en i32)
    global.get $ip ;; push ip to call stack
    call $rpush

    local.get $en ;; point ip to compiled words
    i32.const ${PARAMS}
    i32.add
    global.set $ip
  )

  (func $exit (param $en i32)
    call $rpop ;; pop ip
    global.set $ip
  )

  (func $plus (param $en i32)
    call $pop
    call $pop
    i32.add
    call $push
  )

  (func $pixel (param $en i32)
    call $pop ;; get c
    call $pop ;; get y
    call $pop ;; get x
    call $pix
  )

  (func $loadByte (param $ptr i32) (result i32)
    local.get $ptr ;; check alignment
    i32.const 1
    i32.and
    (if (result i32)
      (then
        local.get $ptr ;; get high byte
        i32.const 1
        i32.sub
        call $loadWord
        i32.const 8
        i32.shr_u
      )
      (else
        local.get $ptr ;; get low byte
        call $loadWord
      )
    )

    i32.const 255 ;; mask byte
    i32.and
  )

  (func $word (result i32)
    global.get $in ;; put result on stack

    (loop $loop
      global.get $in ;; increment $in by one byte
      i32.const 1
      i32.add
      global.set $in

      global.get $in
      call $loadByte
      i32.const 32
      i32.gt_u
      br_if $loop
    )

    (loop $ws
      global.get $in
      call $loadByte
      i32.const 32
      i32.le_u
      (if
        (then
          global.get $in ;; increment $in by one byte
          i32.const 1
          i32.add
          global.set $in

          br $ws
        )
      )
    )
  )

  (func $find (param $ptr i32) (param $dic i32) (result i32)
    local.get $dic
    (if (result i32)
      (then
        local.get $ptr
        local.get $dic
        i32.const ${NAME}
        i32.add
        call $loadWord
        call $compare
        (if (result i32)
          (then
            local.get $ptr
            local.get $dic
            i32.const ${LINK}
            i32.add
            call $loadWord
            call $find
          )
          (else
            local.get $dic
          )
        )
      )
      (else
        i32.const 0
      )
    )
  )

  (func $compare (param $a i32) (param $b i32) (result i32)
    (local $t i32)
    (local $u i32)

    local.get $a
    call $loadByte
    local.set $t
    local.get $b
    call $loadByte
    local.set $u

    local.get $t
    i32.const 32
    i32.le_u
    (if (result i32)
      (then
        local.get $u
        i32.const 32
        i32.le_u
        (if (result i32)
          (then
            i32.const 0
          )
          (else
            i32.const -1
          )
        )
      )
      (else
        local.get $u
        i32.const 32
        i32.le_u
        (if (result i32)
          (then
            i32.const 1
          )
          (else
            local.get $t
            local.get $u
            i32.sub
            local.tee $t
            (if (result i32)
              (then
                local.get $t
              )
              (else
                local.get $a
                i32.const 1
                i32.add
                local.get $b
                i32.const 1
                i32.add
                call $compare
              )
            )
          )
        )
      )
    )
  )

  (func $eval (export "eval") (param $end i32)
    (local $w i32)
    (local $entry i32)
    (local $here i32)

    (loop $loop
      call $word
      local.tee $w
      i32.const ${LATEST}
      call $find
      local.tee $entry
      (if
        (then
          local.get $entry
          i32.const ${FLAGS}
          i32.add
          call $loadWord
          i32.const 1
          i32.and
          (if
            (then
              ;; execute immediate word
              i32.const 0
              global.set $ip

              local.get $entry
              local.get $entry
              i32.const ${CODEWORD}
              i32.add
              call $loadWord
              call_indirect (type $native)
              (loop $exec
                global.get $ip
                (if
                  (then
                    call $next
                    br $exec
                    global.set $ip
                  )
                )
              )
            )
            (else
              local.get $entry ;; store entry
              i32.const ${HERE} ;; get HERE
              call $loadWord
              local.tee $here
              call $storeWord

              local.get $here ;; increment here and store
              i32.const 2
              i32.add
              i32.const ${HERE}
              call $storeWord
            )
          )
        )
        (else
          i32.const ${HERE} ;; get HERE
          call $loadWord
          local.set $here

          i32.const 44 ;; LIT
          local.get $here
          call $storeWord

          local.get $here ;; increment here
          i32.const 2
          i32.add
          local.set $here

          local.get $w ;; read number and add
          call $number
          local.get $here
          call $storeWord

          local.get $here ;; increment here and store
          i32.const 2
          i32.add
          i32.const ${HERE}
          call $storeWord
        )
      )

      global.get $in
      local.get $end
      i32.lt_u
      br_if $loop
    )
  )

  (func $init (export "init") (param $ip i32) (param $ds i32) (param $sp i32) (param $in i32)
    local.get $ip
    global.set $ip

    local.get $ds
    global.set $ds

    local.get $sp
    global.set $sp

    local.get $in
    global.set $in
  )

  (func $next (export "next") (result i32)
    (local $en i32)

    global.get $ip ;; load pointer to word
    call $loadWord

    global.get $ip ;; increment ip
    i32.const 2
    i32.add
    global.set $ip

    local.tee $en ;; call word with en
    local.get $en
    i32.const ${CODEWORD}
    i32.add
    call $loadWord
    call_indirect (type $native)

    global.get $ip
  )
)
