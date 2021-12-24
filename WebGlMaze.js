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

// Is it better to fill in all of the walls and then subtract?
// Or to start empty, then fill in some walls, then fill in some more?
// The former sounds more sensible

var maze;
var ROWS = 10;
var COLUMNS = 10;
var RIGHT = 0;
var DOWN = 1;
var LEFT = 2;
var UP = 3;
var MAX_DIRECTION = UP;
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
        console.log(curr);

        var direction = Math.floor(Math.random() * (DOWN + 1));

        if ((direction == UP) && (curr[1] != 0))
        {
            curr[1] -= 1;
            ((maze[curr[0]])[curr[1]])[DOWN] = false;
        }
        else if ((direction == LEFT) && (curr[0] != 0))
        {
            curr[0] -= 1;
            ((maze[curr[0]])[curr[1]])[RIGHT] = false;
        }
        else if ((direction == RIGHT) && (curr[0] != (COLUMNS - 1)))
        {
            ((maze[curr[0]])[curr[1]])[RIGHT] = false;
            curr[0] += 1;
        }
        else if ((direction == DOWN) && (curr[1] != (ROWS - 1)))
        {
            ((maze[curr[0]])[curr[1]])[DOWN] = false;
            curr[1] += 1;
        }
        else
        {
            continue;
        }
    }
}

var vertices = [];
var MARGIN_X = 50;
var MARGIN_Y = 50;
var START_X = MARGIN_X / 2;
var START_Y = MARGIN_Y / 2;
function convertMazeToVertices()
{
    var cellWidth = (gl.viewportWidth - MARGIN_X) / COLUMNS;
    var cellHeight = (gl.viewportHeight - MARGIN_Y) / ROWS;
    for (var i = 0; i < COLUMNS; i++)
    {
        for (var j = 0; j < ROWS; j++)
        {
            if (maze[i][j][RIGHT])
            {
                vertices.push(
                    START_X + cellWidth * (i + 1), START_Y + cellHeight * j,
                    START_X + cellWidth * (i + 1), START_Y + cellHeight * (j + 1)
                );
            }

            if (maze[i][j][DOWN])
            {
                vertices.push(
                    START_X + cellWidth * i, START_Y + cellHeight * (j + 1),
                    START_X + cellWidth * (i + 1), START_Y + cellHeight * (j + 1)
                );
            }
        }
    }
}

var mazeVertexArrayObject;
var lastTime = 0;
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

    createEmptyMaze();
    createRandomPath([0, 0], [COLUMNS - 1, ROWS - 1]);
    convertMazeToVertices();
    sendNewColor(mazeProgram, [1.0, 1.0, 1.0, 1.0]);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var offset = 0;
    gl.drawArrays(gl.LINES, offset, vertices.length);
}

/*
function tick(now)
{
    drawScene();
    if (lastTime != 0) 
    {
        var elapsed = now - lastTime;
    }

    lastTime = now;
    requestAnimationFrame(tick);
}
*/

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

    drawScene();
}
