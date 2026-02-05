// Construct palette for documentation

// https://ditherit.com/
// [{"hex":"#000000"},{"hex":"#575757"},{"hex":"#a0a0a0"},{"hex":"#ffffff"},{"hex":"#2a4bd7"},{"hex":"#1d6914"},{"hex":"#814a19"},{"hex":"#8126c0"},{"hex":"#9dafff"},{"hex":"#81c57a"},{"hex":"#e9debb"},{"hex":"#ad2323"},{"hex":"#29d0d0"},{"hex":"#ffee33"},{"hex":"#ff9233"},{"hex":"#ffcdf3"}]

const palette = {
  Black: "#000000",
  "Dk. Gray": "#575757",
  "Lt. Gray": "#a0a0a0",
  White: "#ffffff",

  Blue: "#2a4bd7",
  Green: "#1d6914",
  Brown: "#814a19",
  Purple: "#8126c0",

  "Lt. Blue": "#9dafff",
  "Lt. Green": "#81c57a",
  Tan: "#e9debb",
  Red: "#ad2323",

  Cyan: "#29d0d0",
  Yellow: "#ffee33",
  Orange: "#ff9233",
  Pink: "#ffcdf3",
}

export default () => {
  for (const [name, hex] of Object.entries(palette)) {
    const div = document.createElement("div")
    div.style.backgroundColor = hex
    div.title = name
    document.getElementById("palette").appendChild(div)
  }

  // init screen
  const canvas = document.getElementById("canvas")
  const g = canvas.getContext("2d")
  g.fillStyle = "black"
  g.fillRect(0, 0, 255, 255)

  return {
    pixel: (x, y, c) => {
      g.fillStyle = Object.values(palette)[c % 16]
      g.fillRect(x, 255 - y, 1, 1)
    },
  }
}
