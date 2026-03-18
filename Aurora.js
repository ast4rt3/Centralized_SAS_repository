/**
 * Aurora.js - A premium, WebGL-powered animated backdrop.
 * Renders fluid, glowing waves of light.
 */
export default class Aurora {
    constructor(options = {}) {
        this.colorStops = options.colorStops || ["#7cff67", "#B19EEF", "#5227FF"];
        this.blend = options.blend !== undefined ? options.blend : 0.5;
        this.amplitude = options.amplitude !== undefined ? options.amplitude : 1.0;
        this.speed = options.speed !== undefined ? options.speed : 1.0;
        
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.animationFrameId = null;
        this.startTime = Date.now();
    }

    render(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`Aurora: Container ${containerSelector} not found.`);
            return;
        }

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        container.appendChild(this.canvas);

        this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: true });
        if (!this.gl) {
            console.warn("Aurora: WebGL not supported, falling back to CSS gradient.");
            this.handleFallback(container);
            return;
        }

        this.initShaders();
        this.initBuffers();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.animate();
    }

    handleFallback(container) {
        container.style.background = `linear-gradient(135deg, ${this.colorStops.join(', ')})`;
        container.style.backgroundSize = '400% 400%';
        container.style.animation = `aurora-fallback ${20 / this.speed}s ease infinite`;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes aurora-fallback {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);
    }

    initShaders() {
        const vsSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform float uAmplitude;
            uniform float uBlend;

            // Simplex noise-like function for fluid motion
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m;
                m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vec2 uv = vUv;
                float t = uTime * 0.2;
                
                // create wave effect
                float noise1 = snoise(uv * 2.0 + t);
                float noise2 = snoise(uv * 3.0 - t * 0.8);
                
                float combinedNoise = (noise1 + noise2) * 0.5 * uAmplitude;
                
                // Color blending based on noise and coordinates
                float mix1 = smoothstep(-1.0, 1.0, combinedNoise + uv.x);
                float mix2 = smoothstep(-1.0, 1.0, combinedNoise + uv.y);
                
                vec3 color = mix(uColor1, uColor2, mix1);
                color = mix(color, uColor3, mix2 * uBlend);
                
                // Subtle glow/vignette
                float dist = distance(uv, vec2(0.5));
                color *= (1.2 - dist * 0.5);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const vs = this.compileShader(vsSource, this.gl.VERTEX_SHADER);
        const fs = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER);
        
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error("Aurora: Shader link error", this.gl.getProgramInfoLog(this.program));
        }
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error("Aurora: Shader compile error", this.gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    initBuffers() {
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, "position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvas.clientWidth * dpr;
        this.canvas.height = this.canvas.clientHeight * dpr;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        const time = (Date.now() - this.startTime) * 0.001 * this.speed;
        
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        this.gl.useProgram(this.program);
        
        const timeLocation = this.gl.getUniformLocation(this.program, "uTime");
        const color1Location = this.gl.getUniformLocation(this.program, "uColor1");
        const color2Location = this.gl.getUniformLocation(this.program, "uColor2");
        const color3Location = this.gl.getUniformLocation(this.program, "uColor3");
        const ampLocation = this.gl.getUniformLocation(this.program, "uAmplitude");
        const blendLocation = this.gl.getUniformLocation(this.program, "uBlend");
        
        this.gl.uniform1f(timeLocation, time);
        this.gl.uniform1f(ampLocation, this.amplitude);
        this.gl.uniform1f(blendLocation, this.blend);
        
        this.gl.uniform3fv(color1Location, this.hexToRgb(this.colorStops[0]));
        this.gl.uniform3fv(color2Location, this.hexToRgb(this.colorStops[1]));
        this.gl.uniform3fv(color3Location, this.hexToRgb(this.colorStops[2]));
        
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.resize);
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }
}
