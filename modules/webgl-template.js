var gl;

function initGl(canvas) 
{
    try 
    {
        gl = canvas.getContext("webgl2");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } 
    catch (e) 
    {

    }

    if (!gl) 
    {
        alert("Could not initialise WebGL");
    }
}

function compileShader(script, isFragmentShader) 
{
    var shader;
    if (isFragmentShader)
    {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } 
    else
    {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } 

    gl.shaderSource(shader, script);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success)
    {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(fragmentShaderScript, vertexShaderScript)
{
    var fragmentShader = compileShader(fragmentShaderScript, true);
    var vertexShader = compileShader(vertexShaderScript, false);

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success)
    {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function getLocations(program)
{
    program.a_position = gl.getAttribLocation(program, "a_position");
    program.u_projectionMatrix = gl.getUniformLocation(program, "u_projectionMatrix");
    program.u_modelViewMatrix = gl.getUniformLocation(program, "u_modelViewMatrix");
    program.u_color = gl.getUniformLocation(program, "u_color");
}

function sendNewMatrices(program, projectionMatrix, modelViewMatrix)
{
    gl.uniformMatrix4fv(program.u_projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(program.u_modelViewMatrix, false, modelViewMatrix);
}

function sendNewColor(program, color)
{
    gl.uniform4fv(program.u_color, color);
}
