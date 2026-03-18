// --- CONFIGURATION ---
const container = document.querySelector('#character-container');
const jsonPath = 'idle5.json';

// 1. Initialize PIXI Application with Transparency
const app = new PIXI.Application({
    resizeTo: container, // Auto-resizes to the CSS container dimensions
    backgroundAlpha: 0,  // Transparent background so parallax layers show through
    antialias: true
});
container.appendChild(app.view);

const world = new PIXI.Container();
app.stage.addChild(world);

// 2. Variables for State & Tracking
let sprites = {};
let targetMouseX = window.innerWidth / 2;
let targetMouseY = window.innerHeight / 2;
let activeSegment = { start: 0, end: 60, loop: true }; // Default to Idle
let currentFrame = 0;

const segments = {
    idle: { start: 0, end: 60, loop: true },
    angry: { start: 100, end: 130, loop: false }
};

// 3. Load the Animation Data
fetch(jsonPath)
    .then(res => res.json())
    .then(data => {
        setupCharacter(data);
        startAnimationLoop(data);
    })
    .catch(err => console.error("Error loading JSON:", err));

function setupCharacter(data) {
    // Create Sprites from Assets
    for (const id in data.assets) {
        const sprite = new PIXI.Sprite(PIXI.Texture.from(data.assets[id]));
        sprite.anchor.set(0.5);
        sprite.baseX = data.setup?.[id]?.x || 0;
        sprite.baseY = data.setup?.[id]?.y || 0;
        sprites[id] = sprite;
        world.addChild(sprite);
    }

    // Apply Hierarchy
    if (data.hierarchy) {
        for (const [childID, parentID] of Object.entries(data.hierarchy)) {
            if (sprites[childID] && sprites[parentID]) {
                sprites[parentID].addChild(sprites[childID]);
            }
        }
    }

    // Positioning and Scaling the Character
    const scaleFactor = 0.65; // Adjust to scale the character
    world.scale.set(scaleFactor);
    world.x = app.screen.width / 5;
    world.y = app.screen.height / 3; 

    // Interaction Triggers
    world.eventMode = 'static';
    world.cursor = 'pointer';
    world.on('pointerenter', () => { 
        activeSegment = segments.angry; 
        currentFrame = segments.angry.start; 
    });
    world.on('pointerleave', () => { 
        activeSegment = segments.idle; 
        currentFrame = segments.idle.start; 
    });
}

function startAnimationLoop(data) {
    app.ticker.add(() => {
        // Frame Management
        if (currentFrame < activeSegment.end) {
            currentFrame++;
        } else if (activeSegment.loop) {
            currentFrame = activeSegment.start;
        } else {
            currentFrame = activeSegment.end; // Hold on last frame if not looping
        }

        // Keyframe Interpolation
        for (const [id, keyframes] of Object.entries(data.sprites)) {
            const sprite = sprites[id];
            if (!sprite) continue;

            const frameKeys = Object.keys(keyframes).map(Number).sort((a, b) => a - b);
            let prev = frameKeys.filter(f => f <= currentFrame).pop();
            let next = frameKeys.filter(f => f > currentFrame)[0];

            if (prev !== undefined && next !== undefined) {
                const progress = (currentFrame - prev) / (next - prev);
                sprite.baseX = keyframes[prev].x + (keyframes[next].x - keyframes[prev].x) * progress;
                sprite.baseY = keyframes[prev].y + (keyframes[next].y - keyframes[prev].y) * progress;
                sprite.rotation = (keyframes[prev].rotation || 0) + ((keyframes[next].rotation || 0) - (keyframes[prev].rotation || 0)) * progress;
                sprite.alpha = (keyframes[prev].alpha ?? 1) + ((keyframes[next].alpha ?? 1) - (keyframes[prev].alpha ?? 1)) * progress;
            } else if (prev !== undefined) {
                sprite.baseX = keyframes[prev].x;
                sprite.baseY = keyframes[prev].y;
                sprite.rotation = keyframes[prev].rotation || 0;
                sprite.alpha = keyframes[prev].alpha ?? 1;
            }

            // Apply Eye Tracking
            // Apply Eye Tracking
            sprite.x = sprite.baseX;
            sprite.y = sprite.baseY;
            
            if (id === "sprite_1773741586360") { // Pupil Sprite ID
                
                // 1. THE CAGE SETTINGS (Use the exact numbers you dialed in earlier!)
                let rx = 25; 
                let ry = 12; 
                let cageOffsetX = 10; 
                let cageOffsetY = -5;   

                // 2. PARENT SPACE TRACKING
                const localMouse = sprite.parent.toLocal(new PIXI.Point(targetMouseX, targetMouseY));
                let dx = localMouse.x - sprite.baseX;
                let dy = localMouse.y - sprite.baseY;

                // Dampen speed
                let targetX = dx * 0.15;
                let targetY = dy * 0.15;

                // 3. ASYMMETRICAL CLAMPING MATH (The Magic Fix)
                let shiftedX = targetX - cageOffsetX;
                let shiftedY = targetY - cageOffsetY;

                let ellipseCalc = (shiftedX * shiftedX) / (rx * rx) + (shiftedY * shiftedY) / (ry * ry);

                // If it hits the boundary, clamp it
                if (ellipseCalc > 1) {
                    let scale = 1 / Math.sqrt(ellipseCalc);
                    shiftedX = shiftedX * scale;
                    shiftedY = shiftedY * scale;
                }

                // Shift the math back to reality
                let offsetX = shiftedX + cageOffsetX;
                let offsetY = shiftedY + cageOffsetY;

                // 4. APPLY TRANSFORM
                sprite.x = sprite.baseX + offsetX;
                sprite.y = sprite.baseY + offsetY;
            }
        }
    });
}

// 4. Global Mouse Listener for Parallax + Eyes
window.addEventListener('mousemove', (e) => {
    targetMouseX = e.pageX;
    targetMouseY = e.pageY;

    // Parallax for Background Layers
    const layers = document.querySelectorAll('.layer:not(#character-container):not(.sky)');
    const x = (window.innerWidth - e.pageX * 2) / 100;
    const y = (window.innerHeight - e.pageY * 2) / 100;

    layers.forEach(layer => {
        let speed = 2; // Default for back hills

        if (layer.classList.contains('hills-mid')) {
            speed = 4; // Mid hill moves at medium speed
        } else if (layer.classList.contains('hills-front')) {
            speed = 7; // Front hill moves the most (increased for intensity)
        }
        
        layer.style.transform = `translateX(${x * speed}px) translateY(${y * speed}px)`;
    });
});

// 5. Responsive Resizing
window.addEventListener('resize', () => {
    // Re-center the character container if the browser window changes size
    world.x = app.screen.width / 2;
    world.y = app.screen.height / 2;
});