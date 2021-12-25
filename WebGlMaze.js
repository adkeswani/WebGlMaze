var mazeProgram;
var mazeFragmentShaderScript = `#version 300 es

    precision highp float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main(void) 
    {
        out_color = u_color;
    }
`;

var mazeVertexShaderScript = `#version 300 es

    in vec2 a_position; 

    uniform mat4 u_projectionMatrix;
    uniform mat4 u_modelViewMatrix;

    void main(void) 
    {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 0.0, 1.0);
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
}

var mazeVertexArrayObject;
var projectionMatrix = glMatrix.mat4.create();
var modelViewMatrix = glMatrix.mat4.create();

function initMatrices()
{
    glMatrix.mat4.ortho(projectionMatrix, 0, gl.viewportWidth, gl.viewportHeight, 0, -10, 10);
    glMatrix.mat4.identity(modelViewMatrix);
}

function initBuffers()
{
    // Create buffer on GPU
    var vertexBuffer = gl.createBuffer();

    // Say that we're going to use that buffer as the ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Tell attribute how to get data from buffer
    // Create a vertex array object (array of attribute state)
    mazeVertexArrayObject = gl.createVertexArray();

    // Make it the current vertex array
    gl.bindVertexArray(mazeVertexArrayObject);

    // Turn on the attribute, without this the attribute will be a constant
    // Tell it we're going to be putting stuff from buffer into it.
    gl.enableVertexAttribArray(mazeProgram.a_position);

    // How to get data out of the buffer, and bind ARRAY_BUFFER to the attribute
    // Attribute will receive data from that ARRAY_BUFFER
    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(mazeProgram.a_position, size, type, normalize, stride, offset);
}

function drawScene()
{
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(mazeProgram);
    sendNewMatrices(mazeProgram, projectionMatrix, modelViewMatrix);

    sendNewColor(mazeProgram, [1.0, 1.0, 1.0, 1.0]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mazeVertices), gl.STATIC_DRAW);
    var offset = 0;
    gl.drawArrays(gl.LINES, offset, mazeVertices.length);

    sendNewColor(mazeProgram, [0.0, 1.0, 0.0, 1.0]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(solveVertices), gl.STATIC_DRAW);
    var offset = 0;
    gl.drawArrays(gl.LINES, offset, solveVertices.length);
}

var solveVertices = [];
var visited = [];
var next = [];
var target = [COLUMNS - 1, ROWS - 1];
function nextSolveStep()
{
    if (next.length == 0)
    {
        var first = {
            path: [],
            pathEnd: [0, 0]
        }

        next.push(first);
    }

    // Pop and shift are for DFS and BFS respectively! :)
    if ((next[next.length - 1].pathEnd[0] != target[0]) || (next[next.length - 1].pathEnd[1] != target[1]))
    {
        var curr = next.pop(); 
        visited.push(curr.pathEnd);

        if ((curr.pathEnd[0] != COLUMNS - 1) && 
            !maze[curr.pathEnd[0]][curr.pathEnd[1]][RIGHT] && 
            !visited.some((v) => (v[0] == curr.pathEnd[0] + 1) && (v[1] == curr.pathEnd[1])))
        {
            var newNext = {
                path: [...curr.path],
                pathEnd: []
            }

            newNext.path.push(curr.pathEnd);
            newNext.pathEnd = [curr.pathEnd[0] + 1, curr.pathEnd[1]];
            next.push(newNext);
        }

        if ((curr.pathEnd[1] != ROWS - 1) && 
            !maze[curr.pathEnd[0]][curr.pathEnd[1]][DOWN] &&
            !visited.some((v) => (v[0] == curr.pathEnd[0]) && (v[1] == curr.pathEnd[1] + 1)))
        {
            var newNext = {
                path: [...curr.path],
                pathEnd: []
            }

            newNext.path.push(curr.pathEnd);
            newNext.pathEnd = [curr.pathEnd[0], curr.pathEnd[1] + 1];
            next.push(newNext);
        }

        if ((curr.pathEnd[0] != 0) && 
            !maze[curr.pathEnd[0] - 1][curr.pathEnd[1]][RIGHT] &&
            !visited.some((v) => (v[0] == curr.pathEnd[0] - 1) && (v[1] == curr.pathEnd[1])))
        {
            var newNext = {
                path: [...curr.path],
                pathEnd: []
            }

            newNext.path.push(curr.pathEnd);
            newNext.pathEnd = [curr.pathEnd[0] - 1, curr.pathEnd[1]];
            next.push(newNext);
        }

        if ((curr.pathEnd[1] != 0) && 
            !maze[curr.pathEnd[0]][curr.pathEnd[1] - 1][DOWN] &&
            !visited.some((v) => (v[0] == curr.pathEnd[0]) && (v[1] == curr.pathEnd[1] - 1)))
        {
            var newNext = {
                path: [...curr.path],
                pathEnd: []
            }

            newNext.path.push(curr.pathEnd);
            newNext.pathEnd = [curr.pathEnd[0], curr.pathEnd[1] - 1];
            next.push(newNext);
        }
    }

    solveVertices = [];
    var cellWidth = (gl.viewportWidth - MARGIN_X) / COLUMNS;
    var cellHeight = (gl.viewportHeight - MARGIN_Y) / ROWS;
    curr.path.forEach(p => solveVertices.push(
        START_X + cellWidth / 2 + p[0] * cellWidth, 
        START_Y + cellHeight / 2 + p[1] * cellHeight,
        START_X + cellWidth / 2 + p[0] * cellWidth, 
        START_Y + cellHeight / 2 + p[1] * cellHeight
    ));

    solveVertices.shift();
    solveVertices.shift();
}

var lastSolveTime = 0;
var SOLVE_STEP_IN_MS = 50;
function tick(now)
{
    var elapsedSinceLastSolve = now - lastSolveTime;
    if (elapsedSinceLastSolve > SOLVE_STEP_IN_MS)
    {
        nextSolveStep();
        lastSolveTime = now;
    }

    drawScene();
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

    initBuffers();

    createEmptyMaze();
    createRandomPath([0, 0], [COLUMNS - 1, ROWS - 1]);
    convertMazeToVertices();

    tick(0);
}
