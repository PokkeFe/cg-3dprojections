let view;
let ctx;
let scene;
let start_time;
let keysDown = {}

const LEFT = 32; // binary 100000
const RIGHT = 16; // binary 010000
const BOTTOM = 8;  // binary 001000
const TOP = 4;  // binary 000100
const FAR = 2;  // binary 000010
const NEAR = 1;  // binary 000001
const FLOAT_EPSILON = 0.000001;

// Initialization function - called when web page loads
function init() {
    let w = 800;
    let h = 600;
    view = document.getElementById('view');
    view.width = w;
    view.height = h;
    view.transformMatrix = new Matrix(4, 4)
    view.transformMatrix.values = [[w / 2, 0, 0, w / 2],
    [0, h / 2, 0, h / 2],
    [0, 0, 1, 0],
    [0, 0, 0, 1]]

    ctx = view.getContext('2d');

    // initial scene... feel free to change this
    scene = {
        view: {
            type: 'perspective',
            prp: Vector3(44, 20, -16),
            srp: Vector3(20, 20, -40),
            vup: Vector3(0, 1, 0),
            clip: [-19, 5, -10, 8, 12, 100]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4(0, 0, -30, 1),
                    Vector4(20, 0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4(0, 12, -30, 1),
                    Vector4(0, 0, -60, 1),
                    Vector4(20, 0, -60, 1),
                    Vector4(20, 12, -60, 1),
                    Vector4(10, 20, -60, 1),
                    Vector4(0, 12, -60, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                matrix: new Matrix(4, 4)
            },
            {
                type: 'cube',
                center: Vector3(-20, 10, -20),
                width: 20,
                height: 20,
                depth: 20
            },
            {
                type: 'cone',
                center: Vector3(0, 0, 0),
                radius: 10,
                height: 10,
                sides: 10
            }
        ]
    };

    // generate models
    generateModels()
    console.log(scene.models)

    // event handler for pressing arrow keys
    // document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keydown', (event) => {
        keysDown[event.keyCode] = true;
    }, false);
    document.addEventListener('keyup', (event) => {
        delete keysDown[event.keyCode];
    }, false);

    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds
    window.requestAnimationFrame(animate);
}

// Animation loop - repeatedly calls rendering code
function animate(timestamp) {
    // step 1: calculate time (time since start)
    let time = timestamp - start_time;

    // step 1.5: handle input
    for(let key of Object.keys(keysDown)) {
        onKeyDown({keyCode: parseInt(key)})
    }

    // step 2: transform models based on time
    // TODO: implement this!

    // step 3: draw scene
    drawScene();

    // step 4: request next animation frame (recursively calling same function)
    // (may want to leave commented out while debugging initially)
    window.requestAnimationFrame(animate);
}

// Main drawing code - use information contained in variable `scene`
function drawScene() {
    //console.log(scene);

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, view.width, view.height)


    scene.n = new Vector(3)
    scene.n.values = [0, 0, 0]
    scene.n = scene.n.add(scene.view.prp)
    scene.n = scene.n.subtract(scene.view.srp)
    scene.n.normalize()

    scene.u = new Vector(3)
    scene.u.values = [0, 0, 0]
    scene.u = scene.u.add(scene.view.vup)
    scene.u = scene.u.cross(scene.n)
    scene.u.normalize()

    scene.v = new Vector(3)
    scene.v.values = [0, 0, 0]
    scene.v = scene.v.add(scene.n)
    scene.v = scene.v.cross(scene.u)

    // TODO: implement drawing here!
    // For each model, for each edge
    //  * transform to canonical view volume
    //  * clip in 3D
    //  * project to 2D
    //  * draw line

    // TODO: Allow for parallel perspective
    let n = mat4x4Perspective(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip)
    let m = mat4x4MPer()

    for (let model of scene.models) {
        if (model.type === 'generic') {
            // transform the edge list into a canonical view volume copy
            let edges = []
            for (let edge of model.edges) {
                for (let i = 0; i < edge.length - 1; i++) {
                    // Transform to canonical view volume
                    let v1 = model.vertices[edge[i]]
                    let v2 = model.vertices[edge[i + 1]]
                    v1 = Matrix.multiply([n, v1])
                    v2 = Matrix.multiply([n, v2])
                    // Clip
                    let clippedVertices = perspectiveClipping(v1, v2);
                    if (clippedVertices != false) {
                        edges.push([clippedVertices[0], clippedVertices[1]])
                    }
                }
            }

            for (let edge of edges) {
                let v1 = edge[0];
                let v2 = edge[1];

                // Project to 2d
                v1 = Matrix.multiply([m, v1])
                v2 = Matrix.multiply([m, v2])

                // transform to screen coordinates
                v1 = Matrix.multiply([view.transformMatrix, v1])
                v2 = Matrix.multiply([view.transformMatrix, v2])

                // x and y / w
                v1.values[0][0] = v1.values[0][0] / v1.values[3][0];
                v1.values[1][0] = v1.values[1][0] / v1.values[3][0];
                v2.values[0][0] = v2.values[0][0] / v2.values[3][0];
                v2.values[1][0] = v2.values[1][0] / v2.values[3][0];

                // Draw line
                drawLine(
                    v1.x,
                    v1.y,
                    v2.x,
                    v2.y
                );
            }
        }
    }
}

function perspectiveClipping(v1, v2) {
    // Clip in 3d
    let v1outcode = outcodePerspective(v1, scene.view.clip[4])
    let v2outcode = outcodePerspective(v2, scene.view.clip[4])

    // Trivial accept
    if ((v1outcode | v2outcode) == 0) {
        return [v1, v2]
    }
    // Trivial reject
    else if ((v1outcode & v2outcode) != 0) {
        return false
    }
    // Investigate further
    else {

        if (v1outcode != 0) {
            let new_v1 = perspectiveIntersection(v1, v2, v1outcode)
            return perspectiveClipping(new_v1, v2)

        } else if (v2outcode != 0) {
            let new_v2 = perspectiveIntersection(v1, v2, v2outcode)
            return perspectiveClipping(v1, new_v2)
        }
        throw new Error("Both vertices inbounds but not trivally accepted")
    }
}

function perspectiveIntersection(v1, v2, outcode) {
    let t = undefined
    let dx = v2.x - v1.x
    let dy = v2.y - v1.y
    let dz = v2.z - v1.z
    // Clip first vertex
    if ((outcode & LEFT) != 0) {
        t = (v1.z - v1.x) / (dx - dz)
    }
    else if ((outcode & RIGHT) != 0) {
        t = (v1.x + v1.z) / ((dx + dz) * -1)
    }
    else if ((outcode & BOTTOM) != 0) {
        t = (v1.z - v1.y) / (dy - dz)
    }
    else if ((outcode & TOP) != 0) {
        t = (v1.y + v1.z) / ((-dy) - dz)
    }
    else if ((outcode & NEAR) != 0) {
        t = (v1.z - scene.view.clip[4]) / (-dz)
    }
    else if ((outcode & FAR) != 0) {
        t = ((-v1.z) - 1) / dz
    }
    if (t == undefined) {
        throw new Error("t undefined")
    } else {
        return new Vector4(
            (1 - t) * v1.x + t * v2.x,
            (1 - t) * v1.y + t * v2.y,
            (1 - t) * v1.z + t * v2.z,
            v1.w
        )
    }
}

// Get outcode for vertex (parallel view volume)
function outcodeParallel(vertex) {
    let outcode = 0;
    if (vertex.x < (-1.0 - FLOAT_EPSILON)) {
        outcode += LEFT;
    }
    else if (vertex.x > (1.0 + FLOAT_EPSILON)) {
        outcode += RIGHT;
    }
    if (vertex.y < (-1.0 - FLOAT_EPSILON)) {
        outcode += BOTTOM;
    }
    else if (vertex.y > (1.0 + FLOAT_EPSILON)) {
        outcode += TOP;
    }
    if (vertex.x < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.x > (0.0 + FLOAT_EPSILON)) {
        outcode += NEAR;
    }
    return outcode;
}

// Get outcode for vertex (perspective view volume)
function outcodePerspective(vertex, z_min) {
    let outcode = 0;
    if (vertex.x < (vertex.z - FLOAT_EPSILON)) {
        outcode += LEFT;
    }
    else if (vertex.x > (-vertex.z + FLOAT_EPSILON)) {
        outcode += RIGHT;
    }
    if (vertex.y < (vertex.z - FLOAT_EPSILON)) {
        outcode += BOTTOM;
    }
    else if (vertex.y > (-vertex.z + FLOAT_EPSILON)) {
        outcode += TOP;
    }
    if (vertex.x < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.x > (z_min + FLOAT_EPSILON)) {
        outcode += NEAR;
    }
    return outcode;
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLineParallel(line) {
    let result = null;
    let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z);
    let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
    let out0 = outcodeParallel(p0);
    let out1 = outcodeParallel(p1);

    // TODO: implement clipping here!

    return result;
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLinePerspective(line, z_min) {
    let result = null;
    let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z);
    let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
    let out0 = outcodePerspective(p0, z_min);
    let out1 = outcodePerspective(p1, z_min);

    // TODO: implement clipping here!

    return result;
}

// Called when user presses a key on the keyboard down 
function onKeyDown(event) {
    let t, it, r, srpM, srpMa
    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");

            t = new Matrix(4, 4);
            it = new Matrix(4, 4);
            Mat4x4Translate(t, -scene.view.prp.x, -scene.view.prp.y, -scene.view.prp.z)
            Mat4x4Translate(it, scene.view.prp.x, scene.view.prp.y, scene.view.prp.z)
            r = new Matrix(4, 4);
            Mat4x4RotateY(r, Math.PI/100);

            srpM = new Matrix(4, 1);
            srpM.values = [
                [scene.view.srp.x],
                [scene.view.srp.y],
                [scene.view.srp.z],
                [1]
            ]
            
            srpMa = Matrix.multiply([it, r, t, srpM])
            scene.view.srp = new Vector3(srpMa.values[0][0], srpMa.values[1][0], srpMa.values[2][0])

            break;
        case 39: // RIGHT Arrow
            console.log("right");
            
            t = new Matrix(4, 4);
            it = new Matrix(4, 4);
            Mat4x4Translate(t, -scene.view.prp.x, -scene.view.prp.y, -scene.view.prp.z)
            Mat4x4Translate(it, scene.view.prp.x, scene.view.prp.y, scene.view.prp.z)
            r = new Matrix(4, 4);
            Mat4x4RotateY(r, -Math.PI/100);

            srpM = new Matrix(4, 1);
            srpM.values = [
                [scene.view.srp.x],
                [scene.view.srp.y],
                [scene.view.srp.z],
                [1]
            ]
            
            srpMa = Matrix.multiply([it, r, t, srpM])
            scene.view.srp = new Vector3(srpMa.values[0][0], srpMa.values[1][0], srpMa.values[2][0])

            break;
        case 65: // A key
            console.log("A");
            scene.view.prp = scene.view.prp.subtract(scene.u)
            scene.view.srp = scene.view.srp.subtract(scene.u)
            break;
        case 68: // D key
            console.log("D");
            scene.view.prp = scene.view.prp.add(scene.u)
            scene.view.srp = scene.view.srp.add(scene.u)
            break;
        case 83: // S key
            console.log("S");
            scene.view.prp = scene.view.prp.add(scene.n)
            scene.view.srp = scene.view.srp.add(scene.n)
            break;
        case 87: // W key
            console.log("W");
            scene.view.prp = scene.view.prp.subtract(scene.n)
            scene.view.srp = scene.view.srp.subtract(scene.n)
            break;
    }
}

///////////////////////////////////////////////////////////////////////////
// No need to edit functions beyond this point
///////////////////////////////////////////////////////////////////////////

// Called when user selects a new scene JSON file
function loadNewScene() {
    let scene_file = document.getElementById('scene_file');

    console.log(scene_file.files[0]);

    let reader = new FileReader();
    reader.onload = (event) => {
        scene = JSON.parse(event.target.result);
        scene.view.prp = Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]);
        scene.view.srp = Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]);
        scene.view.vup = Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]);

        for (let i = 0; i < scene.models.length; i++) {
            if (scene.models[i].type === 'generic') {
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    scene.models[i].vertices[j] = Vector4(scene.models[i].vertices[j][0],
                        scene.models[i].vertices[j][1],
                        scene.models[i].vertices[j][2],
                        1);
                }
            }
            else {
                scene.models[i].center = Vector4(scene.models[i].center[0],
                    scene.models[i].center[1],
                    scene.models[i].center[2],
                    1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
    };
    reader.readAsText(scene_file.files[0], 'UTF-8');
}

// Draw black 2D line with red endpoints 
function drawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}

function generateModels() {
    for(let i = 0; i < scene.models.length; i++)
    {
        let model = scene.models[i];
        switch(model.type) {
            case 'cube':
                scene.models[i] = generateCube(model.center, model.width, model.height, model.depth);
                break;
            case 'cone':
                scene.models[i] = generateCone(model.center, model.radius, model.height, model.sides);
                break;
        }
    }
}

function generateCube(center, width, height, depth)
{
    let model = {
        type: 'generic',
        vertices: [],
        edges: [],
        matrix: new Matrix(4,4)
    }

    let w = width / 2
    let h = height / 2
    let d = depth / 2

    model.vertices.push(...[
        Vector4(-w, h, -d, 1),
        Vector4(w, h, -d, 1),
        Vector4(w, -h, -d, 1),
        Vector4(-w, -h, -d, 1),
        Vector4(-w, h, d, 1),
        Vector4(w, h, d, 1),
        Vector4(w, -h, d, 1),
        Vector4(-w, -h, d, 1),
    ])

    // translate vertices around centerpoint
    let t = new Matrix(4,4)
    Mat4x4Translate(t, center.x, center.y, center.z)
    for(let i = 0; i < model.vertices.length; i++) {
        model.vertices[i] = new Vector(Matrix.multiply([t, model.vertices[i]]))
    }

    model.edges.push(...[
        [0,1,2,3,0],
        [4,5,6,7,4],
        [0,4],
        [1,5],
        [2,6],
        [3,7]
    ])

    return model
}

function generateCone(center, radius, height, sides)
{
    let model = {
        type: 'generic',
        vertices: [],
        edges: [],
        matrix: new Matrix(4,4)
    }

    // vertices
    const PI2 = Math.PI * 2
    for(let i = 0; i < sides; i += 1) {
        let p = PI2 * (i / sides)
        model.vertices.push(new Vector4(Math.sin(p) * radius,
                                        -(height/2),
                                        Math.cos(p) * radius,
                                        1))
    }
    model.vertices.push(new Vector4(0, (height/2), 0, 1))

    // translate vertices around centerpoint
    let t = new Matrix(4,4)
    Mat4x4Translate(t, center.x, center.y, center.z)
    console.log(t, model.vertices)
    for(let i = 0; i < model.vertices.length; i++) {
        console.log(model.vertices[i])
        model.vertices[i] = new Vector(Matrix.multiply([t, model.vertices[i]]))
    }

    // edges

    model.edges.push([...Array(sides).keys(), 0])

    for(let i = 0; i < model.vertices.length - 1; i++) {
        model.edges.push([i, model.vertices.length - 1])
    }

    return model
}