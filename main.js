document.addEventListener('mousemove', (e) => {
    const layers = document.querySelectorAll('.layer');
    const x = (window.innerWidth - e.pageX * 2) / 100;
    const y = (window.innerHeight - e.pageY * 2) / 100;

    layers.forEach(layer => {
        // Adjust the speed based on the z-index (deeper layers move slower)
        const speed = layer.classList.contains('hills-back') ? 2 : 5;
        const xPos = x * speed;
        const yPos = y * speed;
        
        layer.style.transform = `translateX(${xPos}px) translateY(${yPos}px)`;
    });
});