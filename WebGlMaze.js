var mazeProgram;
var mazeFragmentShaderScript = `#version 300 es

    precision highp float;

    in vec4 v_color;

    out vec4 out_color;

    void main(void) 
    {
        out_color = v_color;
    }
`;

var mazeVertexShaderScript = `#version 300 es

    in vec2 a_position; 
    in vec4 a_color;

    uniform mat4 u_projectionMatrix;
    uniform mat4 u_modelViewMatrix;

    out vec4 v_color;

    void main(void) 
    {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 0.0, 1.0);
        v_color = a_color;
    }
`;

var maze;
//var ROWS = 100;
var ROWS = 20;
var COLUMNS = ROWS;
var RIGHT = 0;
var DOWN = 1;
var LEFT = 2;
var UP = 3;
var MAX_DIRECTION = UP;
var MAX_LENGTH = ROWS / 10;
function createEmptyMaze()
{
    maze = [];
    for (var i = 0; i < COLUMNS; i++)
    {
        var row = [];
        for (var j = 0; j < ROWS; j++)
        {
            var cell = [true, true];
            row.push(cell);
        }

        maze.push(row);
    }
}

function createRandomPath(from, to)
{
    var curr = from;
    while ((curr[0] != to[0]) || (curr[1] != to[1]))
    {
        //console.log(curr);

        var direction = Math.floor(Math.random() * (MAX_DIRECTION + 1));
        var length = Math.floor(Math.random() * MAX_LENGTH);

        for (var currLength = 0; currLength < length; currLength++)
        {
            if ((direction == UP) && (curr[1] != 0))
            {
                curr[1] -= 1;
                maze[curr[0]][curr[1]][DOWN] = false;
            }
            else if ((direction == LEFT) && (curr[0] != 0))
            {
                curr[0] -= 1;
                maze[curr[0]][curr[1]][RIGHT] = false;
            }
            else if ((direction == RIGHT) && (curr[0] != (COLUMNS - 1)))
            {
                maze[curr[0]][curr[1]][RIGHT] = false;
                curr[0] += 1;
            }
            else if ((direction == DOWN) && (curr[1] != (ROWS - 1)))
            {
                maze[curr[0]][curr[1]][DOWN] = false;
                curr[1] += 1;
            }
            else
            {
                continue;
            }
        }
    }
}

var mazeVertices = [];
var mazeColors = [];
var MARGIN_X = 50;
var MARGIN_Y = 50;
var START_X = MARGIN_X / 2;
var START_Y = MARGIN_Y / 2;
function convertMazeToVertices()
{
    mazeVertices = [];

    // Draw left and top walls
    mazeVertices.push(START_X, START_Y);
    mazeVertices.push(START_X + gl.viewportWidth - MARGIN_X, START_Y);
    mazeVertices.push(START_X, START_Y);
    mazeVertices.push(START_X, START_Y + gl.viewportHeight - MARGIN_Y);

    var cellWidth = (gl.viewportWidth - MARGIN_X) / COLUMNS;
    var cellHeight = (gl.viewportHeight - MARGIN_Y) / ROWS;
    for (var i = 0; i < COLUMNS; i++)
    {
        for (var j = 0; j < ROWS; j++)
        {
            if (maze[i][j][RIGHT])
            {
                mazeVertices.push(
                    START_X + cellWidth * (i + 1), START_Y + cellHeight * j,
                    START_X + cellWidth * (i + 1), START_Y + cellHeight * (j + 1)
                );
            }

            if (maze[i][j][DOWN])
            {
                mazeVertices.push(
                    START_X + cellWidth * i, START_Y + cellHeight * (j + 1),
                    START_X + cellWidth * (i + 1), START_Y + cellHeight * (j + 1)
                );
            }
        }
    }

    mazeColors = Array(mazeVertices.length).fill(1.0, 1.0, 1.0, 1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mazeVertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mazeColors), gl.STATIC_DRAW);
}

var mazeVertexArrayObject;
var projectionMatrix = glMatrix.mat4.create();
var modelViewMatrix = glMatrix.mat4.create();

function initMatrices()
{
    glMatrix.mat4.ortho(projectionMatrix, 0, gl.viewportWidth, gl.viewportHeight, 0, -10, 10);
    glMatrix.mat4.identity(modelViewMatrix);
}

var vertexBuffer;
var colorBuffer;
function initBuffers()
{
    vertexBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();

    mazeVertexArrayObject = gl.createVertexArray();
    gl.bindVertexArray(mazeVertexArrayObject);

    solves.forEach(s => {
        s.vertexBuffer = gl.createBuffer();
        s.colorBuffer = gl.createBuffer();
    });
}

function drawScene(allSolveVerticesAndColors)
{
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(mazeProgram);
    sendNewMatrices(mazeProgram, projectionMatrix, modelViewMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(mazeProgram.a_position);
    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(mazeProgram.a_position, size, type, normalize, stride, offset);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(mazeProgram.a_color);
    gl.enableVertexAttribArray(mazeProgram.a_color);
    var size = 4;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(mazeProgram.a_color, size, type, normalize, stride, offset);

    var offset = 0;
    gl.drawArrays(gl.LINES, offset, mazeVertices.length / 2);

    allSolveVerticesAndColors.forEach(s =>
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, s.vertexBuffer);
        gl.enableVertexAttribArray(mazeProgram.a_position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.vertices), gl.STATIC_DRAW);
        var size = 2;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(mazeProgram.a_position, size, type, normalize, stride, offset);

        gl.bindBuffer(gl.ARRAY_BUFFER, s.colorBuffer);
        gl.enableVertexAttribArray(mazeProgram.a_color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.colors), gl.STATIC_DRAW);
        var size = 4;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(mazeProgram.a_color, size, type, normalize, stride, offset);

        gl.drawArrays(gl.LINES, offset, s.vertices.length / 2); // Number of vertices, not number of elements!!!!
    });
}

var DFS = 0;
var BFS = 1;
var ASTAR = 2;
var GREEDY = 3;

var TARGET = [COLUMNS - 1, ROWS - 1];

function getNextToVisitIndex(solve)
{
    var nextToVisitIndex = 0;
    switch (solve.algorithm)
    {
        case DFS:
            nextToVisitIndex = solve.toVisit.length - 1;
            break;
        case BFS:
            nextToVisitIndex = 0;
            break;
        case ASTAR:
        case GREEDY:
            var minCost = Number.MAX_VALUE;
            for (var i = 0; i < solve.toVisit.length; i++)
            {
                cost = (TARGET[0] - solve.toVisit[i].pathEnd[0]) + (TARGET[1] - solve.toVisit[i].pathEnd[1]);
                if (solve.algorithm == ASTAR)
                {
                    cost += solve.toVisit[i].path.length;
                }

                if (cost < minCost)
                {
                    nextToVisitIndex = i;
                    minCost = cost;
                }
            }

            break;
    }

    return nextToVisitIndex;
}

function nextSolveStep(solve)
{
    if (solve.toVisit.length == 0)
    {
        var first = {
            path: [],
            pathEnd: [0, 0]
        }

        solve.toVisit.push(first);
        solve.visited.push(first.pathEnd);
    }

    var nextToVisitIndex = getNextToVisitIndex(solve);
    if ((solve.toVisit[nextToVisitIndex].pathEnd[0] != TARGET[0]) || (solve.toVisit[nextToVisitIndex].pathEnd[1] != TARGET[1]))
    {
        solve.steps += 1;
        var curr = solve.toVisit[nextToVisitIndex];
        solve.toVisit.splice(nextToVisitIndex, 1);
        if ((curr.pathEnd[0] != COLUMNS - 1) && 
            !maze[curr.pathEnd[0]][curr.pathEnd[1]][RIGHT] && 
            !solve.visited.some((v) => (v[0] == curr.pathEnd[0] + 1) && (v[1] == curr.pathEnd[1])))
        {
            var newNext = {
                path: [...curr.path, curr.pathEnd],
                pathEnd: [curr.pathEnd[0] + 1, curr.pathEnd[1]]
            };

            solve.toVisit.push(newNext);
            solve.visited.push(newNext.pathEnd);
        }

        if ((curr.pathEnd[1] != ROWS - 1) && 
            !maze[curr.pathEnd[0]][curr.pathEnd[1]][DOWN] &&
            !solve.visited.some((v) => (v[0] == curr.pathEnd[0]) && (v[1] == curr.pathEnd[1] + 1)))
        {
            var newNext = {
                path: [...curr.path, curr.pathEnd],
                pathEnd: [curr.pathEnd[0], curr.pathEnd[1] + 1]
            };

            solve.toVisit.push(newNext);
            solve.visited.push(newNext.pathEnd);
        }

        if ((curr.pathEnd[0] != 0) && 
            !maze[curr.pathEnd[0] - 1][curr.pathEnd[1]][RIGHT] &&
            !solve.visited.some((v) => (v[0] == curr.pathEnd[0] - 1) && (v[1] == curr.pathEnd[1])))
        {
            var newNext = {
                path: [...curr.path, curr.pathEnd],
                pathEnd: [curr.pathEnd[0] - 1, curr.pathEnd[1]]
            };

            solve.toVisit.push(newNext);
            solve.visited.push(newNext.pathEnd);
        }

        if ((curr.pathEnd[1] != 0) && 
            !maze[curr.pathEnd[0]][curr.pathEnd[1] - 1][DOWN] &&
            !solve.visited.some((v) => (v[0] == curr.pathEnd[0]) && (v[1] == curr.pathEnd[1] - 1)))
        {
            var newNext = {
                path: [...curr.path, curr.pathEnd],
                pathEnd: [curr.pathEnd[0], curr.pathEnd[1] - 1]
            };

            solve.toVisit.push(newNext);
            solve.visited.push(newNext.pathEnd);
        }
    }
    else if (!solve.solved)
    {
        solve.solved = true;
        console.log(`Algorithm ${solve.algorithm} steps: ${solve.steps}, cost: ${solve.toVisit[nextToVisitIndex].path.length + 1}`);
    }

    nextToVisitIndex = getNextToVisitIndex(solve);
    solve.vertices = [];
    var cellWidth = (gl.viewportWidth - MARGIN_X) / COLUMNS;
    var cellHeight = (gl.viewportHeight - MARGIN_Y) / ROWS;
    solve.toVisit[nextToVisitIndex].path.forEach(p => solve.vertices.push(
        START_X + cellWidth / 2 + p[0] * cellWidth, 
        START_Y + cellHeight / 2 + p[1] * cellHeight,
        START_X + cellWidth / 2 + p[0] * cellWidth, 
        START_Y + cellHeight / 2 + p[1] * cellHeight
    ));

    solve.vertices.shift();
    solve.vertices.shift();

    solve.vertices.push(
        START_X + cellWidth / 2 + solve.toVisit[nextToVisitIndex].pathEnd[0] * cellWidth, 
        START_Y + cellHeight / 2 + solve.toVisit[nextToVisitIndex].pathEnd[1] * cellHeight
    );

    for (var i = 0; i < solve.vertices.length / 2; i++)
    {
        solve.colors.push(...solve.COLOR);
    }
}

var lastSolveTime = 0;
var SOLVE_STEP_IN_MS = 5;

var bfsSolve = {
    vertices: [],
    visited: [],
    toVisit: [],
    colors: [],
    COLOR: [0.0, 1.0, 0.0, 1.0],
    colorBuffer: null,
    vertexBuffer: null,
    solved: false,
    algorithm: BFS,
    steps: 0
};

var dfsSolve = {
    vertices: [],
    visited: [],
    toVisit: [],
    colors: [],
    COLOR: [1.0, 0.0, 0.0, 1.0],
    colorBuffer: null,
    vertexBuffer: null,
    solved: false,
    algorithm: DFS,
    steps: 0
};

var astarSolve = {
    vertices: [],
    visited: [],
    toVisit: [],
    colors: [],
    COLOR: [0.0, 1.0, 1.0, 1.0],
    colorBuffer: null,
    vertexBuffer: null,
    solved: false,
    algorithm: ASTAR,
    steps: 0
};

var greedySolve = {
    vertices: [],
    visited: [],
    toVisit: [],
    colors: [],
    COLOR: [1.0, 0.0, 1.0, 1.0],
    colorBuffer: null,
    vertexBuffer: null,
    solved: false,
    algorithm: GREEDY,
    steps: 0
};

var solves = [bfsSolve, dfsSolve, astarSolve, greedySolve];

function tick(now)
{
    //var elapsedSinceLastSolve = now - lastSolveTime;
    //if (elapsedSinceLastSolve > SOLVE_STEP_IN_MS)
    //{
    solves.forEach(s => nextSolveStep(s));
    //    lastSolveTime = now;
    //}

    drawScene(solves);
    requestAnimationFrame(tick);
}

function mazeStart() 
{
    var canvas = document.getElementById("maze");
    initGl(canvas);

    initMatrices();

    mazeProgram = createProgram(mazeFragmentShaderScript, mazeVertexShaderScript);
    getLocations(mazeProgram);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    initBuffers(solves);

    createEmptyMaze();
    createRandomPath([0, 0], [COLUMNS - 1, ROWS - 1]);
    convertMazeToVertices();

    tick();
}
