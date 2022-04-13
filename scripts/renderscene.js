let view;
let ctx;
let scene;
let start_time;
let keysDown = {}
let last_time = 0;
let recursion_counter;

const MOVE_SPEED = 0.2
const TURN_SPEED = 0.01

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
            clip: [-12, 12, -12, 12, 10, 150]
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
                center: Vector3(-20, 10, -18),
                width: 20,
                height: 20,
                depth: 20
            },
            {
                type: 'cone',
                center: Vector3(-20, 30, -18),
                radius: 10,
                height: 20,
                sides: 10,
                animation: {
                    axis: 'y',
                    rps: 0.01
                }
            },
            {
                type: 'cylinder',
                center: Vector3(-30, 40, -40),
                radius: 10,
                height: 30,
                sides: 10,
                animation: {
                    axis: 'z',
                    rps: 0.01
                }
            },
            {
                type: 'sphere',
                center: Vector3(-20, 45, -18),
                radius: 5,
                slices: 12,
                stacks: 12,
                animation: {
                    axis: 'y',
                    rps: 0.2
                }
            }
        ]
    };

    // generate models
    generateModels()

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
    let delta_time = time - last_time;
    last_time = time;

    // step 1.5: handle input
    for (let key of Object.keys(keysDown)) {
        onKeyDown({ keyCode: parseInt(key) })
    }

    // step 2: transform models based on time
    animateModels(delta_time)

    // step 3: draw scene
    drawScene();

    // step 4: request next animation frame (recursively calling same function)
    // (may want to leave commented out while debugging initially)
    window.requestAnimationFrame(animate);
}

// Main drawing code - use information contained in variable `scene`
function drawScene() {
    //redraw background every frame
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
                    recursion_counter = 0
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

function parallelClipping(v1, v2) {
    recursion_counter++;
    if(recursion_counter>10) return false;

    let v1outcode = outcodeParallel(v1);
    let v2outcode = outcodeParallel(v2);

    //trivial accept
    if((v1outcode | v2outcode) == 0) {
        return [v1, v2]
    }
    //trivial reject
    else if((v1outcode & v2outcode) != 0) {
        return false
    }
    //investigate further
    else {
        if(v1outcode != 0) {
            let new_v1 = parallelIntersection(v1, v2, v1outcode)
            return parallelClipping(new_v1, v2)
        } else if (v2outcode != 0) {
            let new_v2 = parallelIntersection(v1, v2, v2outcode)
            return parallelClipping(v1, new_v2);
        }
        throw new Error("Both vertices inbounds but not trivially accepted")
    }
}

function parallelIntersection(v1, v2, outcode) {
    let t
    let dx = v2.x - v1.x
    let dy = v2.y - v1.y
    let dz = v2.z - v1.z


    if ((outcode & LEFT) != 0) {
        //clip against left edge, x = -1
        t = ((-1) - v1.x)/((-v1.x) + v2.x)
    }
    else if ((outcode & RIGHT) != 0) {
        //clip against right edge,  x= 1
        t = ((1) - v1.x)/((-v1.x) + v2.x)
    }
    else if ((outcode & BOTTOM) != 0) {
        //clip against bototm edge, y = -1
        t = ((-1) - v1.y)/((-v1.y) + v2.y)
    }
    else if ((outcode & TOP) != 0) {
        //clip against top edge, y = 1
        t = ((1) - v1.y)/((-v1.y) + v2.y)
    }
    else if ((outcode & NEAR) != 0) {
        //clip against near edge, z = 0
        t = ((0) - v1.z)/((-v1.z) + v2.z)
    }
    else if ((outcode & FAR) != 0) {
        //clip against far edge, z = -1
        t = ((-1) - v1.z)/((-v1.z) + v2.z)
    }
    if (t == undefined) {
        throw new Error("T undefined")
    } else {
        //return new vector for clipped vertex
        return new Vector4(
            (1 - t) * v1.x + t * v2.x,
            (1 - t) * v1.y + t * v2.y,
            (1 - t) * v1.z + t * v2.z,
            v1.w
        )
    }
}

function perspectiveClipping(v1, v2) {
    recursion_counter++
    if(recursion_counter > 10) return false
    // Clip in 3d
    let v1outcode = outcodePerspective(v1, scene.view.clip[4])
    let v2outcode = outcodePerspective(v2, scene.view.clip[4])

    // Trivial accept: both endpoints are within the view
    if ((v1outcode | v2outcode) == 0) {
        return [v1, v2]
    }
    // Trivial reject: both endpoints are outside the same edge
    else if ((v1outcode & v2outcode) != 0) {
        return false
    }
    // Investigate further
    else {
        //select and endpoint outside the view rectangle
        if (v1outcode != 0) {
            //v1 is clipped against the view volume
            let new_v1 = perspectiveIntersection(v1, v2, v1outcode)
            //recursively repeat until trivially accepted or rejected.
            return perspectiveClipping(new_v1, v2)

        } else if (v2outcode != 0) {
            //v2 is clipped against the view volume
            let new_v2 = perspectiveIntersection(v1, v2, v2outcode)
            //recursively repeat until trivially accepted or rejected.
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
    // find 1st bit set to 1 in outcode, find t value from parametric equations
    if ((outcode & LEFT) != 0) {
        t = (v1.z - v1.x) / (dx - dz)
    }
    else if ((outcode & RIGHT) != 0) {
        t = (v1.x + v1.z) / ((-dx) - dz)
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
        //return new vector for clipped vertex
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
    if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.z > (0.0 + FLOAT_EPSILON)) {
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
    if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.z > (z_min + FLOAT_EPSILON)) {
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

/* -------------------------------------------------------------------------- */
/*                                  Controls                                  */
/* -------------------------------------------------------------------------- */

// Called when user presses a key on the keyboard down 
function onKeyDown(event) {
    let t, it, r, srpM, srpMa
    let v;
    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");

            t = new Matrix(4, 4);
            it = new Matrix(4, 4);
            Mat4x4Translate(t, -scene.view.prp.x, -scene.view.prp.y, -scene.view.prp.z)
            Mat4x4Translate(it, scene.view.prp.x, scene.view.prp.y, scene.view.prp.z)
            r = new Matrix(4, 4);
            Mat4x4RotateY(r, Math.PI * TURN_SPEED);

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
            Mat4x4RotateY(r, -Math.PI * TURN_SPEED);

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
            v = new Vector3(scene.u.x, scene.u.y, scene.u.z)
            v.scale(MOVE_SPEED)
            scene.view.prp = scene.view.prp.subtract(v)
            scene.view.srp = scene.view.srp.subtract(v)
            break;
        case 68: // D key
            console.log("D");
            v = new Vector3(scene.u.x, scene.u.y, scene.u.z)
            v.scale(MOVE_SPEED)
            scene.view.prp = scene.view.prp.add(v)
            scene.view.srp = scene.view.srp.add(v)
            break;
        case 83: // S key
            console.log("S");
            v = new Vector3(scene.n.x, scene.n.y, scene.n.z)
            v.scale(MOVE_SPEED)
            scene.view.prp = scene.view.prp.add(v)
            scene.view.srp = scene.view.srp.add(v)
            break;
        case 87: // W key
            console.log("W");
            v = new Vector3(scene.n.x, scene.n.y, scene.n.z)
            v.scale(MOVE_SPEED)
            scene.view.prp = scene.view.prp.subtract(v)
            scene.view.srp = scene.view.srp.subtract(v)
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

/* -------------------------------------------------------------------------- */
/*                                Model Parsing                               */
/* -------------------------------------------------------------------------- */

function generateModels() {
    for (let i = 0; i < scene.models.length; i++) {
        let model = scene.models[i];
        let animation = model.animation;
        switch (model.type) {
            case 'cube':
                scene.models[i] = generateCube(model.center, model.width, model.height, model.depth);
                break;
            case 'cone':
                scene.models[i] = generateCone(model.center, model.radius, model.height, model.sides);
                break;
            case 'cylinder':
                scene.models[i] = generateCylinder(model.center, model.radius, model.height, model.sides);
                break;
            case 'sphere':
                scene.models[i] = generateSphere(model.center, model.radius, model.slices, model.stacks)
                break;
            case 'generic':
                // Generate centerpoint for animations
                generateCenterpoint(scene.models[i])
        }
        // preserve animation details
        if (animation) {
            scene.models[i].animation = animation
        }
    }
}

function generateCube(center, width, height, depth) {
    let model = {
        type: 'generic',
        vertices: [],
        edges: [],
        matrix: new Matrix(4, 4),
        center: center
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
    let t = new Matrix(4, 4)
    Mat4x4Translate(t, center.x, center.y, center.z)
    for (let i = 0; i < model.vertices.length; i++) {
        model.vertices[i] = new Vector(Matrix.multiply([t, model.vertices[i]]))
    }

    model.edges.push(...[
        [0, 1, 2, 3, 0],
        [4, 5, 6, 7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7]
    ])

    return model
}

function generateCone(center, radius, height, sides) {
    let model = {
        type: 'generic',
        vertices: [],
        edges: [],
        matrix: new Matrix(4, 4),
        center: center
    }

    // vertices
    const PI2 = Math.PI * 2
    for (let i = 0; i < sides; i += 1) {
        let p = PI2 * (i / sides)
        model.vertices.push(new Vector4(Math.sin(p) * radius,
            -(height / 2),
            Math.cos(p) * radius,
            1))
    }
    model.vertices.push(new Vector4(0, (height / 2), 0, 1))

    // translate vertices around centerpoint
    let t = new Matrix(4, 4)
    Mat4x4Translate(t, center.x, center.y, center.z)
    for (let i = 0; i < model.vertices.length; i++) {
        model.vertices[i] = new Vector(Matrix.multiply([t, model.vertices[i]]))
    }

    // edges

    model.edges.push([...Array(sides).keys(), 0])

    for (let i = 0; i < model.vertices.length - 1; i++) {
        model.edges.push([i, model.vertices.length - 1])
    }

    return model
}

function generateCylinder(center, radius, height, sides) {
    let model = {
        type: 'generic',
        vertices: [],
        edges: [],
        matrix: new Matrix(4, 4),
        center: center
    }

    // vertices
    const PI2 = Math.PI * 2
    for (let i = 0; i < sides; i += 1) {
        let p = PI2 * (i / sides)
        model.vertices.push(new Vector4(Math.sin(p) * radius,
            -(height / 2),
            Math.cos(p) * radius,
            1))
    }
    for (let i = 0; i < sides; i += 1) {
        let p = PI2 * (i / sides)
        model.vertices.push(new Vector4(Math.sin(p) * radius,
            (height / 2),
            Math.cos(p) * radius,
            1))
    }

    // translate vertices around centerpoint
    let t = new Matrix(4, 4)
    Mat4x4Translate(t, center.x, center.y, center.z)
    for (let i = 0; i < model.vertices.length; i++) {
        model.vertices[i] = new Vector(Matrix.multiply([t, model.vertices[i]]))
    }

    // edges
    let bottom_edge = []
    let top_edge = []
    for (let i = 0; i < sides; i++) {
        bottom_edge.push(i)
        top_edge.push(sides + i)
        model.edges.push([i, sides + i])
    }
    bottom_edge.push(0)
    top_edge.push(sides)
    model.edges.push(bottom_edge)
    model.edges.push(top_edge)

    return model
}

function generateSphere(center, radius, slices, stacks) {
    let model = {
        type: 'generic',
        vertices: [],
        edges: [],
        matrix: new Matrix(4, 4),
        center: center
    }

    // vertices
    const PI2 = Math.PI * 2
    for (let stack_i = 1; stack_i < (stacks + 1); stack_i++) {
        let phi = Math.PI * (stack_i / (stacks + 1))
        let height = Math.cos(phi);
        let radius = Math.sin(phi);
        for (let i = 0; i < slices; i += 1) {
            let p = PI2 * (i / slices)
            model.vertices.push(new Vector4(
                Math.sin(p) * radius,
                height,
                Math.cos(p) * radius,
                1))
        }
    }

    // add top and bottom vertices
    model.vertices.push(new Vector4(0, 1, 0, 1))
    model.vertices.push(new Vector4(0, -1, 0, 1))

    let s = new Matrix(4, 4)
    Mat4x4Scale(s, radius, radius, radius);
    for (let i = 0; i < model.vertices.length; i++) {
        model.vertices[i] = new Vector(Matrix.multiply([s, model.vertices[i]]))
    }


    // translate vertices around centerpoint
    let t = new Matrix(4, 4)
    Mat4x4Translate(t, center.x, center.y, center.z)
    for (let i = 0; i < model.vertices.length; i++) {
        model.vertices[i] = new Vector(Matrix.multiply([t, model.vertices[i]]))
    }

    // edges
    // handle slices and stacks first
    for(let i = 0; i < stacks; i++) {
        let edge = []
        for(let j = 0; j < slices; j++) {
            edge.push(i * stacks + j)
        }
        edge.push(i * stacks)
        model.edges.push(edge)
    }

    for(let i = 0; i < stacks - 1; i++) {
        for(let j = 0; j < slices; j++) {
            model.edges.push([(i * stacks) + j, (i * stacks) + j + stacks])
        }
    }

    // attach top and bottom vertices
    let top_vertex = model.vertices.length - 2;
    let bottom_vertex = model.vertices.length - 1;

    for(let i = 0; i < slices; i++) {
        model.edges.push([i, top_vertex])
        model.edges.push([(slices * stacks) - slices + i, bottom_vertex])
    }

    return model
}

function generateCenterpoint(model) {
    // Average all points
    let center = new Vector3(0, 0, 0)
    let count = 0;
    for(let vertex of model.vertices) {
        center.x = center.x + vertex.x
        center.y = center.y + vertex.y
        center.z = center.z + vertex.z
        count++;
    }
    center.x = center.x / count;
    center.y = center.y / count;
    center.z = center.z / count;

    model.center = center;
}

function animateModels(delta_time) {
    for(let i = 0; i < scene.models.length; i++) {
        let model = scene.models[i]
        if(model.animation && model.center) {
            // 2 translation and 1 rotation matrix
            let t1 = new Matrix(4, 4);
            let t2 = new Matrix(4, 4);
            //translation 1 to the origin
            Mat4x4Translate(t1, -model.center.x, -model.center.y, -model.center.z);
            //translation 2 back to position
            Mat4x4Translate(t2, model.center.x, model.center.y, model.center.z);
            let r = new Matrix(4,4);
            //angle is function of rotation speed over time
            let theta = (Math.PI * 2 * model.animation.rps) / (1000 / delta_time)
            //switch for axis of rotation
            switch(model.animation.axis) {
                case 'x':
                    Mat4x4RotateX(r, theta)
                    break;
                case 'y':
                    Mat4x4RotateY(r, theta)
                    break;
                case 'z':
                    Mat4x4RotateZ(r, theta)
                    break;
                default:
                    throw new Error("No proper axis provided")
            }
            for(let j = 0; j < model.vertices.length; j++) {
                //for each vertex: translate to the origin, rotate by theta, translate back to original position.
                scene.models[i].vertices[j] = Matrix.multiply([t2, r, t1, model.vertices[j]])
            }
        }
    }
}