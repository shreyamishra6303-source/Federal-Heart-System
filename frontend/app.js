// app.js - Three.js Implementation

// --- Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfcf8f2); // Match CSS background

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 12;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- Heart Geometry Creation ---
// We will create a custom heart geometry using a Parametric function to mimic the reference image's organic shape
class HeartGeometry extends THREE.BufferGeometry {
    constructor(uSegments = 64, vSegments = 64) {
        super();
        const positions = [];
        const normals = [];
        const uvs = [];

        for (let i = 0; i <= uSegments; i++) {
            const u = i / uSegments;
            const phi = u * Math.PI * 2; // 0 to 2pi

            for (let j = 0; j <= vSegments; j++) {
                const v = j / vSegments;
                const theta = v * Math.PI; // 0 to pi

                // Heart equation (modified for 3D)
                // Using a slightly more spherical heart to match the "moving nucleus" cell-like reference
                const x = 16 * Math.pow(Math.sin(phi), 3) * Math.sin(theta);
                const y = (13 * Math.cos(phi) - 5 * Math.cos(2 * phi) - 2 * Math.cos(3 * phi) - Math.cos(4 * phi)) * Math.sin(theta);
                const z = 8 * Math.cos(theta); // Give it depth

                // Scale down
                const scale = 0.12;
                positions.push(x * scale, y * scale, z * scale);
                uvs.push(u, v);
            }
        }

        const indices = [];
        for (let i = 0; i < uSegments; i++) {
            for (let j = 0; j < vSegments; j++) {
                const a = i * (vSegments + 1) + j;
                const b = i * (vSegments + 1) + j + 1;
                const c = (i + 1) * (vSegments + 1) + j;
                const d = (i + 1) * (vSegments + 1) + j + 1;

                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        this.setIndex(indices);
        this.computeVertexNormals();
    }
}

// --- Shader Material ---
// The reference image uses a highly translucent, noisy, and iridescent material.
// We will build a customized ShaderMaterial for this "Biological AI" aesthetic.

const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simplex 3D Noise function (simplified in-shader or we use vertex displacement)
    // We will pass the noise generation from JS or calculate a simple one here. 
    // To match the cellular look, we displace vertices based on noise.
    
    // Perlin noise helper
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

    float cnoise(vec3 P){
        vec3 Pi0 = floor(P); // Integer part for indexing
        vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P); // Fractional part for interpolation
        vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
        return 2.2 * n_xyz;
    }

    void main() {
        vUv = uv;
        vNormal = normal;
        
        // Displace vertices to create organic pulsing
        float noise = cnoise(position * 2.0 + uTime * 0.5);
        vec3 newPosition = position + normal * (noise * 0.15); // Displace along normal
        
        vPosition = newPosition;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

const fragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        // Fresnel effect for translucent edges (like the reference)
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = dot(viewDirection, vNormal);
        fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
        fresnel = pow(fresnel, 3.0); // Sharpen the edge
        
        // Iridescent Core Colors (matching reference moving nucleus)
        // Reference uses pinks, purples, oranges
        vec3 color1 = vec3(1.0, 0.4, 0.7); // Bright pink
        vec3 color2 = vec3(0.4, 0.7, 1.0); // Light blue
        vec3 color3 = vec3(1.0, 0.9, 0.5); // Warm yellow/orange
        
        // Mix based on position and time to create moving colors
        float mix1 = sin(vPosition.x * 2.0 + uTime) * 0.5 + 0.5;
        float mix2 = cos(vPosition.y * 3.0 - uTime * 0.8) * 0.5 + 0.5;
        
        vec3 baseColor = mix(color1, color2, mix1);
        baseColor = mix(baseColor, color3, mix2);
        
        // Add fresnel glow to the edges
        vec3 finalColor = baseColor + vec3(1.0, 1.0, 1.0) * fresnel * 0.8;
        
        // The nucleus style has high opacity at edges, slightly transparent in center
        float alpha = 0.8 + fresnel * 0.2;
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// Create the Mesh
const geometry = new HeartGeometry(128, 128);
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide
});

const heartMesh = new THREE.Mesh(geometry, material);
// Rotate initial so it stands upright
heartMesh.rotation.x = Math.PI;
scene.add(heartMesh);

// --- Inner Nucleus Particles ---
// To match the OWKIN "moving nucleus", let's add an inner core of moving particles
const particleCount = 2000;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleOriginalPositions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);

const colorCore1 = new THREE.Color('#ff2a75');
const colorCore2 = new THREE.Color('#4d90ff');

for(let i=0; i<particleCount; i++) {
    // Random position within a smaller sphere
    const r = Math.random() * 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    particlePositions[i*3] = x;
    particlePositions[i*3+1] = y;
    particlePositions[i*3+2] = z;
    
    particleOriginalPositions[i*3] = x;
    particleOriginalPositions[i*3+1] = y;
    particleOriginalPositions[i*3+2] = z;
    
    // Mix colors based on position
    const mixedColor = colorCore1.clone().lerp(colorCore2, Math.random());
    particleColors[i*3] = mixedColor.r;
    particleColors[i*3+1] = mixedColor.g;
    particleColors[i*3+2] = mixedColor.b;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

const particleMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
particleSystem.position.y = 0.5; // Offset to center of heart
scene.add(particleSystem);

// --- Lighting ---
// Shader handles most of it, but adding lights for overall scene brightness
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// --- Animation Loop ---
const clock = new THREE.Clock();
const simplex = new SimplexNoise();

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    
    // Update Shader Uniforms
    material.uniforms.uTime.value = elapsedTime;
    
    // Rotate the entire heart slowly
    heartMesh.rotation.y += 0.005;
    heartMesh.rotation.z = Math.sin(elapsedTime * 0.5) * 0.1;
    
    // Animate Particles (Swirling Nucleus Effect)
    const positions = particleSystem.geometry.attributes.position.array;
    for(let i=0; i<particleCount; i++) {
        const ox = particleOriginalPositions[i*3];
        const oy = particleOriginalPositions[i*3+1];
        const oz = particleOriginalPositions[i*3+2];
        
        // Create swirling movement
        const timeOffset = elapsedTime * 0.5;
        const noiseX = simplex.noise3D(ox, oy, timeOffset);
        const noiseY = simplex.noise3D(ox + 10, oy + 10, timeOffset);
        const noiseZ = simplex.noise3D(ox + 20, oy + 20, timeOffset);
        
        positions[i*3] = ox + noiseX * 0.5;
        positions[i*3+1] = oy + noiseY * 0.5;
        positions[i*3+2] = oz + noiseZ * 0.5;
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.rotation.y -= 0.01; // Counter rotation
    
    // Smooth Follow Mouse Interaction
    const targetVector = new THREE.Vector3(
        (mouseX * 2) * -1,
        (mouseY * 2) * 1,
        camera.position.z
    );
    camera.lookAt(heartMesh.position);
    
    // Gentle camera parallax
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.05;
    
    renderer.render(scene, camera);
}

// --- Interaction ---
let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (event) => {
    // Normalize mouse coordinates from -1 to +1
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Window Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start Animation
animate();
