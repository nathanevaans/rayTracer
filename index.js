//https://weblog.jamisbuck.org/2015/10/31/mazes-blockwise-geometry.html
// make thin maze -> convert to thick maze

class Cell {
    constructor(x, y) {
        this.x = x // col
        this.y = y // row
        this.walls = [true, true, true, true] // top, right, bottom, left
        this.visited = false
    }

    static #getIndex(x, y) {
        if (x < 0 || y < 0 || x > GRID_SIZE - 1 || y > GRID_SIZE - 1) return -1
        return GRID_SIZE * y + x
    }

    getUnvisitedNeighbour() {
        const unvisitedNeighbours = [
            GRID[Cell.#getIndex(this.x, this.y - 1)],
            GRID[Cell.#getIndex(this.x + 1, this.y)],
            GRID[Cell.#getIndex(this.x, this.y + 1)],
            GRID[Cell.#getIndex(this.x - 1, this.y)]
        ].filter(cell => cell && !cell.visited)

        if (unvisitedNeighbours.length > 0) return unvisitedNeighbours[Math.floor(Math.random() * unvisitedNeighbours.length)]
        return undefined
    }

    removeWalls(other) {
        if (this.x < other.x) {
            this.walls[1] = false
            other.walls[3] = false
        } else if (this.x > other.x) {
            this.walls[3] = false
            other.walls[1] = false
        }

        if (this.y < other.y) {
            this.walls[2] = false
            other.walls[0] = false
        } else if (this.y > other.y) {
            this.walls[0] = false
            other.walls[2] = false
        }
    }
}

// constants
const GRID_SIZE = 6

// grid
const makeGrid = () => {
    const grid = []
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            grid.push(new Cell(j, i))
        }
    }
    return grid
}

// maze generation
const algo = (current) => {
    current.visited = true
    let next = current.getUnvisitedNeighbour()

    let stack = []

    while (next || stack.length > 0) {
        if (next) {
            stack.push(current)
            current.removeWalls(next)
            current = next
            current.visited = true
            next = current.getUnvisitedNeighbour()
        } else {
            current = stack.pop()
            next = current.getUnvisitedNeighbour()
        }
    }
}

const convertToBlockWise = () => {
    const newRows = GRID_SIZE * 2 + 1
    const newCols = GRID_SIZE * 2 + 1

    const newGrid = Array.from({length: newRows}, (_, i) => {
        return Array.from({length: newCols}, (_, j) => {
            if (i === 0 || j === 0) return 1 // left and top side of the maze
            return 0
        })
    })

    GRID.forEach(cell => {
        if (cell.walls[1]) newGrid[2 * cell.y + 1][2 * (cell.x + 1)] = 1 // right wall
        if (cell.walls[2]) newGrid[2 * (cell.y + 1)][2 * cell.x + 1] = 1 // bottom wall
        newGrid[2 * (cell.y + 1)][2 * (cell.x + 1)] = 1 // bottom right is always a wall
    })

    return newGrid
}

const GRID = makeGrid()
algo(GRID[0])
const map = convertToBlockWise()

// TODO: add strafe sideways
const canvas = document.createElement('canvas')
canvas.setAttribute('width', '100%')
canvas.setAttribute('height', '100%')
document.body.appendChild(canvas)
const context = canvas.getContext('2d')

const CELL_SIZE = 64
const PLAYER_SIZE = 15

const toRadians = (deg) => {
    return deg * Math.PI / 180
}

const FOV = toRadians(75)


const player = {
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 1.5,
    angle: 0,
    speed: 0
}

const FPS = 60
const cycleDelay = Math.floor(1000 / FPS)
let oldCycleTime = 0
let cycleCount = 0
let fpsRate = ''

const clearScreen = () => {
    context.fillStyle = 'white'
    context.fillRect(0, 0, canvas.width, canvas.height)
}

const movePlayer = () => {
    player.x += Math.cos(player.angle) * player.speed
    player.y += Math.sin(player.angle) * player.speed
}

const outOfMapBounds = (x, y) => {
    return x < 0 || x >= map[0].length || y < 0 || y >= map.length
}

const getVCollision = (angle) => {
    const right = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2)

    const firstX = right
        ? Math.floor(player.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE
        : Math.floor(player.x / CELL_SIZE) * CELL_SIZE
    const firstY = player.y + (firstX - player.x) * Math.tan(angle)

    const xA = right ? CELL_SIZE : -CELL_SIZE
    const yA = xA * Math.tan(angle)

    let wall
    let nextX = firstX
    let nextY = firstY
    while (!wall) {
        const cellX = right
            ? Math.floor(nextX / CELL_SIZE)
            : Math.floor(nextX / CELL_SIZE) - 1
        const cellY = Math.floor(nextY / CELL_SIZE)

        if (outOfMapBounds(cellX, cellY)) {
            break
        }
        wall = map[cellY][cellX]
        if (!wall) {
            nextX += xA
            nextY += yA
        }
    }
    return {angle, distance: Math.hypot(player.x - nextX, player.y - nextY), vertical: true}
}

const getHCollision = (angle) => {
    const up = Math.abs(Math.floor(angle / Math.PI) % 2)

    const firstY = up
        ? Math.floor(player.y / CELL_SIZE) * CELL_SIZE
        : Math.floor(player.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE
    const firstX = player.x + (firstY - player.y) / Math.tan(angle)

    const yA = up ? -CELL_SIZE : CELL_SIZE
    const xA = yA / Math.tan(angle)

    let wall
    let nextX = firstX
    let nextY = firstY
    while (!wall) {
        const cellX = Math.floor(nextX / CELL_SIZE)
        const cellY = up
            ? Math.floor(nextY / CELL_SIZE) - 1
            : Math.floor(nextY / CELL_SIZE)

        if (outOfMapBounds(cellX, cellY)) {
            break
        }
        wall = map[cellY][cellX]
        if (!wall) {
            nextX += xA
            nextY += yA
        }
    }
    return {angle, distance: Math.hypot(player.x - nextX, player.y - nextY), vertical: false}
}

const castRay = (ray) => {
    const vCollision = getVCollision(ray)
    const hCollision = getHCollision(ray)

    return hCollision.distance >= vCollision.distance ? vCollision : hCollision
}

const getRays = () => {
    const initAngle = player.angle - FOV / 2
    const numberOfRays = canvas.width
    const angleStep = FOV / numberOfRays
    return Array.from({length: numberOfRays}, (_, i) => {
        const angle = initAngle + i * angleStep
        return castRay(angle)
    })
}

const fixFishEye = (distance, angle, playerAngle) => {
    const diff = angle - playerAngle;
    return distance * Math.cos(diff);
}

const renderScene = (rays) => {
    rays.forEach((ray, i) => {
        const distance = fixFishEye(ray.distance, ray.angle, player.angle)
        const wallHeight = ((CELL_SIZE * 5) / distance) * 250
        context.fillStyle = ray.vertical ? 'darkblue' : 'blue'
        context.fillRect(i, canvas.height / 2 - wallHeight / 2, 1, wallHeight)
        context.fillStyle = 'white'
        context.fillRect(
            i,
            canvas.height / 2 + wallHeight / 2,
            1,
            canvas.height / 2 - wallHeight / 2
        )
        context.fillStyle = 'black'
        context.fillRect(i, 0, 1, canvas.height / 2 - wallHeight / 2)
    });
}

const renderMinimap = (posX = 0, posY = 0, scale = 1, rays) => {
    const cellSize = scale * CELL_SIZE
    map.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                context.fillStyle = 'grey'
                context.fillRect(posX + x * cellSize, posY + y * cellSize, cellSize, cellSize)
            }
        })
    })

    context.fillStyle = 'blue'
    context.fillRect(
        (posX + player.x - PLAYER_SIZE / 2) * scale,
        (posY + player.y - PLAYER_SIZE / 2) * scale,
        PLAYER_SIZE * scale, PLAYER_SIZE * scale
    )

    context.strokeStyle = 'yellow'
    rays.forEach(ray => {
        context.beginPath()
        context.moveTo(player.x * scale, player.y * scale)
        context.lineTo(
            (player.x + Math.cos(ray.angle) * ray.distance) * scale,
            (player.y + Math.sin(ray.angle) * ray.distance) * scale
        );
        context.closePath();
        context.stroke();
    })

    const rayLength = PLAYER_SIZE * 1.5
    context.strokeStyle = 'blue'
    context.beginPath()
    context.moveTo(posX + player.x * scale, posY + player.y * scale)
    context.lineTo(
        (player.x + Math.cos(player.angle) * rayLength) * scale,
        (player.y + Math.sin(player.angle) * rayLength) * scale
    )
    context.closePath()
    context.stroke()
}

const gameLoop = () => {
    // calculate fps
    cycleCount++
    if (cycleCount >= 60) cycleCount = 0
    let startTime = Date.now()
    let cycleTime = startTime - oldCycleTime
    oldCycleTime = startTime
    if (cycleCount % 60 === 0) fpsRate = Math.floor(1000 / cycleTime)

    // resize canvas
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // update screen
    clearScreen()
    movePlayer()
    const rays = getRays()
    renderScene(rays)
    renderMinimap(0, 0, 0.25, rays)

    // render FPS
    context.fillStyle = 'white'
    context.font = '20px Monospace'
    context.fillText(`FPS: ${fpsRate}`, canvas.width - 100, 20)

}

setInterval(gameLoop, cycleDelay)

document.addEventListener('keydown', (event) => {
    if (event.key === 'w') {
        player.speed = 2
    } else if (event.key === 's') {
        player.speed = -2
    }
})

document.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 's') {
        player.speed = 0
    }
})

document.addEventListener('mousemove', (event) => {
    player.angle += toRadians(event.movementX / 6)
})
