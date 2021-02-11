
var canvas = document.getElementById('my_Canvas');
gl = canvas.getContext('webgl');

var textCanvas = document.getElementById("text");
var ctx = textCanvas.getContext("2d");


//initial parameters
var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
var fov = 40;

var THETA=2.5, PHI=2.0;
var D = 20;
var zmin = 1;
var zmax = 100;

var target = [0, 0, 0];
var up = [0, 1, 0];

var drag;

var proj_matrix;
var view_matrix;
var camera;

var lightPosition = [0.0, 10, 0.0];
var lightAmbient =  [0.2, 0.2, 0.2];
var lightDiffuse =  [1.0, 1.0, 1.0];
var lightSpecular = [1.0, 1.0, 1.0];


//floor material info
var materialAmbient = [0.19225, 0.19225, 0.19225];
var materialDiffuse = [0.50754, 0.50754, 0.50754];
var materialSpecular = [0.0,0.0,0.0];
var materialShininess = 10;


//floor geometry info
const W=5;
const L=5;
const H=-0.22;
var numVerticesFloor = 6;
var vertices_floor=[[-W,H,L], [-W,H,-L], [W,H,-L], [W,H,L]];

var points_floor_array = [];
var normals_floor_array = [];
var tangent_floor_array = [];
var texcoord2D_floor_array = [];

uv1=[0,0];
uv2=[1,0];
uv3=[1,1];
uv4=[0,1];

uv_floor=[uv1,uv2,uv3,uv4];


/*============================== DEFINING THE BUFFER ==========================*/

colorFloor();
points_floor_array=m4.flatten(points_floor_array);
for(var i=0; i<numVerticesFloor; i++) normals_floor_array[i]= Array.prototype.slice.call(m4.normalize(normals_floor_array[i])); //normalize the normals
normals_floor_array=m4.flatten(normals_floor_array);
texcoord2D_floor_array = m4.flatten(texcoord2D_floor_array);
tangent_floor_array = m4.flatten(tangent_floor_array);

/*console.log(points_floor_array);
console.log(normals_floor_array);
console.log(texcoord2D_floor_array);
console.log(tangent_floor_array);
console.log(bitangent_floor_array);*/


//buffer per il suolo
var vertex_buffer = gl.createBuffer ();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, points_floor_array, gl.STATIC_DRAW);
// Create and store data into normal buffer
var normal_buffer = gl.createBuffer();
gl.bindBuffer( gl.ARRAY_BUFFER, normal_buffer);
gl.bufferData( gl.ARRAY_BUFFER, normals_floor_array, gl.STATIC_DRAW );

var tanget_buffer = gl.createBuffer();
gl.bindBuffer( gl.ARRAY_BUFFER, tanget_buffer );
gl.bufferData( gl.ARRAY_BUFFER, tangent_floor_array, gl.STATIC_DRAW );

var texcoord_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
gl.bufferData(gl.ARRAY_BUFFER, texcoord2D_floor_array, gl.STATIC_DRAW);


var normalMap = gl.createTexture();
// Fill the texture with a 1x1 blue pixel.
gl.bindTexture(gl.TEXTURE_2D, normalMap);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

// Asynchronously load an image
var image_bump = new Image();
image_bump.src = "bump texture/brickwall_normal.jpg";
image_bump.addEventListener('load', function() {
	// Now that the image has loaded make copy it to the texture.
	gl.bindTexture(gl.TEXTURE_2D, normalMap);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image_bump);

    // Check if the image is a power of 2 in both dimensions.
    if (isPowerOf2(image_bump.width) && isPowerOf2(image_bump.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
       console.log('mipmap');
    } else {
       // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });



/*============================================ SHADER PROGRAM ====================================*/
//webgl-utilis.js
var shaderprogram_phong_normal_mapping = webglUtils.createProgramFromScripts(gl,
   ["vertex-shader-phong-normal-mapping", "fragment-shader-phong-normal-mapping"]);

/*============================================ MOUSE EVENTS ====================================*/

var mouseDown=function(e){
    drag=true;
    old_x=e.pageX, old_y=e.pageY;
    e.preventDefault();
    return false;
};

var mouseUp=function(e){
	drag=false;
};

var mouseMove=function(e){
	if (!drag) return false;
	dX=-(e.pageX-old_x)*2*Math.PI/canvas.width;
	dY=-(e.pageY-old_y)*2*Math.PI/canvas.height;
	//console.log('stampa',dX,dY);
	THETA+=dX;
	PHI+=dY;
	old_x=e.pageX, old_y=e.pageY;
	e.preventDefault();
	render();
};

document.getElementById("Button1").onclick = function(){D *= 1.1};
document.getElementById("Button2").onclick = function(){D *= 0.9};
document.getElementById("Button5").onclick = function(){fov  *= 1.1; fov *= 1.1};
document.getElementById("Button6").onclick = function(){fov *= 0.9; fov *= 0.9};

canvas.onmousedown=mouseDown;
canvas.onmouseup=mouseUp;
canvas.mouseout=mouseUp;
canvas.onmousemove=mouseMove;

/*============================================ UTILS ====================================*/

function degToRad(d){
	return d * Math.PI / 180;
}

function isPowerOf2(value) {
	return (value & (value - 1)) === 0;
}

function normalize(v, dst) {
    dst = new Array(3);
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      dst[0] = v[0] / length;
      dst[1] = v[1] / length;
      dst[2] = v[2] / length;
    }
    return dst;
}

/*============================================ DRAW FUNCTIONS ====================================*/

//disegna il suolo
function drawFloor(){
	gl.useProgram(shaderprogram_phong_normal_mapping);

	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "Ka" ), materialAmbient);
	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "Kd" ), materialDiffuse);
	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "Ks"),  materialSpecular);

	gl.uniform1f(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "shinessVal"), materialShininess);
	gl.uniform1i(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "normalMap"), 0);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, normalMap);

	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "ambientColor" ),  lightAmbient);
	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "diffuseColor" ),  lightDiffuse);
	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "specularColor" ), lightSpecular);
	gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "lightPos" ),      lightPosition);
  gl.uniform3fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "viewPos" ),   		 camera);

	gl.uniformMatrix4fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "Pmatrix"), false, proj_matrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "Vmatrix"), false, view_matrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "Mmatrix"), false, m4.identity());
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderprogram_phong_normal_mapping, "normalMat"), false, m4.transpose(m4.inverse(view_matrix)));

	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.vertexAttribPointer(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "position"), 3, gl.FLOAT, false,0,0);
	gl.enableVertexAttribArray(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "position"));

	gl.bindBuffer( gl.ARRAY_BUFFER, normal_buffer);
  gl.vertexAttribPointer(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "normal"), 3, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "normal"));

	gl.bindBuffer(gl.ARRAY_BUFFER, tanget_buffer);
	gl.vertexAttribPointer(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "tangent"), 3, gl.FLOAT, false,0,0);
	gl.enableVertexAttribArray(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "tangent"));

	gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
	gl.vertexAttribPointer(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "a_texcoord"), 2, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray(gl.getAttribLocation(shaderprogram_phong_normal_mapping, "a_texcoord"));

	gl.drawArrays(gl.TRIANGLES, 0, numVerticesFloor);
}


//per ogni faccia del cubo
function colorFloor(){
    quad( 1, 0, 3, 2 );
}


function quad(a, b, c, d) {
	//normals
  var t1 = m4.subtractVectors(vertices_floor[b], vertices_floor[a]);
  var t2 = m4.subtractVectors(vertices_floor[c], vertices_floor[b]);
  var normal=[];
  normal = m4.cross(t1, t2, normal);

	tangent1 =  new Array();
	tangent2 =  new Array();

	deltaUV1 = new Array();
	deltaUV2 = new Array();

	edge1=new Array();
	edge2=new Array();


	// triangle 1
	edge1[0]=vertices_floor[b][0]-vertices_floor[c][0];
	edge1[1]=vertices_floor[b][1]-vertices_floor[c][1];
	edge1[2]=vertices_floor[b][2]-vertices_floor[c][2];
	edge2[0]=vertices_floor[a][0]-vertices_floor[c][0];
	edge2[1]=vertices_floor[a][1]-vertices_floor[c][1];
	edge2[2]=vertices_floor[a][2]-vertices_floor[c][2];

	deltaUV1[0]= uv2[0]-uv1[0];
  deltaUV1[1]= uv2[1]-uv1[1];
	deltaUV2[0]= uv3[0]-uv1[0];
	deltaUV2[1]= uv3[1]-uv1[1];

	f = 1.0 / (deltaUV1[0] * deltaUV2[1]- deltaUV2[0]* deltaUV1[1]);

  tangent1[0] = f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0])/10;
  tangent1[1] = f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1])/10;
  tangent1[2] = f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])/10;

  points_floor_array.push(vertices_floor[a]);
	texcoord2D_floor_array.push(uv_floor[a])
  normals_floor_array.push(normal);
	tangent_floor_array.push(tangent1);

  points_floor_array.push(vertices_floor[b]);
	texcoord2D_floor_array.push(uv_floor[b])
  normals_floor_array.push(normal);
	tangent_floor_array.push(tangent1);

	points_floor_array.push(vertices_floor[c]);
	texcoord2D_floor_array.push(uv_floor[c])
  normals_floor_array.push(normal);
	tangent_floor_array.push(tangent1);


	// triangle 2
	edge1[0]=vertices_floor[a][0]-vertices_floor[c][0];
	edge1[1]=vertices_floor[a][1]-vertices_floor[c][1];
	edge1[2]=vertices_floor[a][2]-vertices_floor[c][2];
	edge2[0]=vertices_floor[d][0]-vertices_floor[c][0];
	edge2[1]=vertices_floor[d][1]-vertices_floor[c][1];
	edge2[2]=vertices_floor[d][2]-vertices_floor[c][2];

	deltaUV1[0]= uv3[0]-uv1[0];
  deltaUV1[1]= uv3[1]-uv1[1];
	deltaUV2[0]= uv4[0]-uv1[0];
	deltaUV2[1]= uv4[1]-uv1[1];

	f = 1.0 / (deltaUV1[0] * deltaUV2[1]- deltaUV2[0]* deltaUV1[1]);

  tangent2[0] = f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0])/10;
  tangent2[1] = f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1])/10;
  tangent2[2] = f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])/10;

  points_floor_array.push(vertices_floor[a]);
	texcoord2D_floor_array.push(uv_floor[a])
  normals_floor_array.push(normal);
	tangent_floor_array.push(tangent2);

  points_floor_array.push(vertices_floor[c]);
	texcoord2D_floor_array.push(uv_floor[c])
  normals_floor_array.push(normal);
	tangent_floor_array.push(tangent2);

  points_floor_array.push(vertices_floor[d]);
	texcoord2D_floor_array.push(uv_floor[d])
  normals_floor_array.push(normal);
	tangent_floor_array.push(tangent2);

}




/*============================================ RENDER FUNCTION + FPS ====================================*/

var render=function() {
	//set projection matrix
	proj_matrix = m4.perspective(degToRad(fov), aspect, zmin, zmax);

	camera = [target[0]+D*Math.sin(PHI)*Math.cos(THETA),
            target[1]+D*Math.sin(PHI)*Math.sin(THETA),
            target[2]+D*Math.cos(PHI)];

	view_matrix = m4.inverse(m4.lookAt(camera, target, up));


	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(1.0, 1.0, 1.0, 1);
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	gl.clearDepth(1.0);
	gl.viewport(0.0, 0.0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


	drawFloor();

	/*text on canvas and webgl */
	ctx.font = '18pt Calibri';
	ctx.fillStyle = 'green';
	ctx.fillText('Bump Mapping WebGL', 180, 80);

}


const FRAMES_PER_SECOND = 30;  // Valid values are 60,30,20,15,10...
// set the mim time to render the next frame
const FRAME_MIN_TIME = (1000/60) * (60 / FRAMES_PER_SECOND) - (1000/60) * 0.5;
var lastFrameTime = 0;  // the last frame time

function update(time){
    if(time-lastFrameTime < FRAME_MIN_TIME){ //skip the frame if the call is too early
        window.requestAnimationFrame(update);
        return; // return as there is nothing to do
    }
    lastFrameTime = time; // remember the time of the rendered frame
    // render the frame
    render();
    window.requestAnimationFrame(update); // get next frame
}


/*======================================= INIT =========================================*/
update(); // start animation
window.requestAnimationFrame(update);
