: IF IMMEDIATE ' 0BRANCH , HERE @ 0 , ;
: THEN IMMEDIATE DUP HERE @ SWAP - SWAP ! ;
: ELSE IMMEDIATE ' BRANCH , HERE @ 0 , SWAP DUP HERE @ SWAP - SWAP ! ;

: BEGIN IMMEDIATE HERE @ ;
: WHILE IMMEDIATE ' 0BRANCH , HERE @ 0 , ;
: REPEAT IMMEDIATE SWAP
    ' BRANCH ,  HERE @ - ,
    DUP HERE @ SWAP - SWAP ! ;

( allocate space for 20 stars )
VARIABLE stars
stars 60 ALLOT

( setup x, y, and speed )
stars
0 BEGIN DUP 20 < WHILE
  SWAP
  256 RAND OVER !
  1 +
  256 RAND OVER !
  1 + 
  1 3 RAND + OVER !
  1 +
  SWAP
1 + REPEAT
DROP

( render loop )
BEGIN 1 WHILE
  WAIT CLS

  stars
  0 BEGIN DUP 20 < WHILE
    SWAP
    DUP @
    OVER 1 + @
    2 PICK 2 + @
    DUP 2 < IF DROP 21 ELSE 3 < IF 42 ELSE 63 THEN THEN
    PIXEL
    DUP @ OVER 2 + @ + OVER !
    3 +
    SWAP
  1 + REPEAT DROP
  DROP
REPEAT
