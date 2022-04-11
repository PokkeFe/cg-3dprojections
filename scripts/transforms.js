// create a 4x4 matrix to the parallel projection / view matrix
function mat4x4Parallel(prp, srp, vup, clip) {
    
    //VRC calculations
    //n-axis: normalized(PRP-SRP);
    let n = new Vector(3);
    n.values = [0, 0, 0];
    n = n.add(prp);
    n = n.subtract(srp);
    n.normalize;

    //u-axis: normalized(VUP x n-axis)
    let u = new Vector(3);
    u.values = [0, 0, 0];
    u = u.add(vup);
    u = u.cross(n);
    u.normalize();

    //v-axis: n-axis x u-axis
    let v = new Vector(3);
    v.values = [0, 0, 0];
    v = v.add(n)
    v = v.cross

    //Window calculations
    //Center of Window: [(left+right)/2, (bottom-top)/2]
    let cw = new Vector(3);
    cw.x = (clip[0] + clip[1]) / 2;
    cw.y = (clip[2] + clip[3]) / 2;
    cw.z = cw.z = -clip[4];

    //DOP: CW-PRP
    let dop = new Vector(3);
    dop.values = [0, 0, 0];
    dop = dop.add(cw);
    dop = dop.subtract(prp);

    // 1. translate PRP to origin
    let t = new Matrix(4, 4);
    Mat4x4Translate(t, -prp.x, -prp.y, -prp.z);

    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    let r = new Matrix(4, 4);
    r.values = [[u.x, u.y, u.z, 0],
                [v.x, v.y, v.z, 0],
                [n.x, n.y, n.z, 0],
                [0, 0, 0, 1]]

    // 3. shear such that CW is on the z-axis
    let shx = (-dop.x)/dop.z;
    let shy = (-dop.y)/ dop.z;
    let sh = new Matrix(4, 4);
    Mat4x4ShearXY(sh, shx, shy);

    // 4. translate near clipping plane to origin
    let t1 = new Matrix(4,4);
    Mat4x4Translate(t1, 0, 0, clip[4])

    // 5. scale such that view volume bounds are ([-1,1], [-1,1], [-1,0])
    let sx = 2/(clip[1]-clip[0]);
    let sy = 2/(clip[3]-clip[2]);
    let sz = 1/clip[5];
    let s = new Matrix(4, 4);
    Mat4x4Scale(s, sx, sy, sz);

    // ...
    // let transform = Matrix.multiply([...]);
    let transform = Matrix.multiply([s, t1, sh, r, t])

    // return transform;
    return transform;
}

// create a 4x4 matrix to the perspective projection / view matrix
function mat4x4Perspective(prp, srp, vup, clip) {

    let n = new Vector(3)
    n.values = [0,0,0]
    n = n.add(prp)
    n = n.subtract(srp)
    n.normalize()

    let u = new Vector(3)
    u.values = [0,0,0]
    u = u.add(vup)
    u = u.cross(n)
    u.normalize()

    let v = new Vector(3)
    v.values = [0,0,0]
    v = v.add(n)
    v = v.cross(u)

    let cw = new Vector(3)
    cw.x = (clip[0] + clip[1]) / 2
    cw.y = (clip[2] + clip[3]) / 2
    cw.z = -clip[4]

    let dop = new Vector(3)
    dop.values = [0, 0, 0]
    dop = dop.add(cw)
    //dop = dop.subtract(prp)

    // 1. translate PRP to origin
    let t = new Matrix(4,4);
    Mat4x4Translate(t, -prp.x, -prp.y, -prp.z);

    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    let r = new Matrix(4, 4);
    r.values = [[u.x, u.y, u.z, 0],
                [v.x, v.y, v.z, 0],
                [n.x, n.y, n.z, 0],
                [0, 0, 0, 1]];

    // 3. shear such that CW is on the z-axis
    let shx = (-dop.x)/dop.z;
    let shy = (-dop.y)/dop.z;
    let sh = new Matrix(4, 4);
    Mat4x4ShearXY(sh, shx, shy)

    // 4. scale such that view volume bounds are ([z,-z], [z,-z], [-1,zmin])
    let sx = (2 * clip[4]) / ((clip[1] - clip[0]) * clip[5])
    let sy = (2 * clip[4]) / ((clip[3] - clip[2]) * clip[5])
    let sz = 1 / clip[5]
    let s = new Matrix(4, 4);
    Mat4x4Scale(s, sx, sy, sz)
    
    // let transform = Matrix.multiply([...]);
    let transform = Matrix.multiply([s, sh, r , t]);

    // return transform;
    return transform
}

// create a 4x4 matrix to project a parallel image on the z=0 plane
function mat4x4MPar() {
    let mpar = new Matrix(4, 4);
    // mpar.values = ...;
    mpar.values = [[1, 0, 0, 0],
                   [0, 1, 0, 0],
                   [0, 0, 0, 0],
                   [0, 0, 0, 1]]
    return mpar;
}

// create a 4x4 matrix to project a perspective image on the z=-1 plane
function mat4x4MPer() {
    let mper = new Matrix(4, 4);
    // mper.values = ...;
    mper.values = [[1, 0, 0, 0],
                   [0, 1, 0, 0],
                   [0, 0, 1, 0],
                   [0, 0, -1, 0]];
    return mper;
}



///////////////////////////////////////////////////////////////////////////////////
// 4x4 Transform Matrices                                                         //
///////////////////////////////////////////////////////////////////////////////////

// set values of existing 4x4 matrix to the identity matrix
function mat4x4Identity(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, 1, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the translate matrix
function Mat4x4Translate(mat4x4, tx, ty, tz) {
    // mat4x4.values = ...;
    mat4x4.values = [[1, 0, 0, tx],
                     [0, 1, 0, ty],
                     [0, 0, 1, tz],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the scale matrix
function Mat4x4Scale(mat4x4, sx, sy, sz) {
    // mat4x4.values = ...;
    mat4x4.values = [[sx, 0, 0, 0],
                     [0, sy, 0, 0],
                     [0, 0, sz, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about x-axis matrix
function Mat4x4RotateX(mat4x4, theta) {
    // mat4x4.values = ...;
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    mat4x4.values = [[1, 0, 0, 0],
                     [0, c,-s, 0],
                     [0, s, c, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about y-axis matrix
function Mat4x4RotateY(mat4x4, theta) {
    // mat4x4.values = ...;
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    mat4x4.values = [[c, 0, s, 0],
                     [0, 1, 0, 0],
                     [-s, 0, c, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about z-axis matrix
function Mat4x4RotateZ(mat4x4, theta) {
    // mat4x4.values = ...;
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    mat4x4.values = [[c,-s, 0, 0],
                     [s, c, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the shear parallel to the xy-plane matrix
function Mat4x4ShearXY(mat4x4, shx, shy) {
    // mat4x4.values = ...;
    mat4x4.values = [[1, 0, shx, 0],
                     [0, 1, shy, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// create a new 3-component vector with values x,y,z
function Vector3(x, y, z) {
    let vec3 = new Vector(3);
    vec3.values = [x, y, z];
    return vec3;
}

// create a new 4-component vector with values x,y,z,w
function Vector4(x, y, z, w) {
    let vec4 = new Vector(4);
    vec4.values = [x, y, z, w];
    return vec4;
}
