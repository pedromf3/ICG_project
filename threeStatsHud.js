function formatCompactNumber(value) {
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(value);
}

export function createThreeStatsHudUpdater(renderer, hudElement, isEnabled = () => true) {
    if (!renderer || !hudElement) {
        return () => {};
    }

    let lastUpdateTime = performance.now();
    let frameCount = 0;

    return function updateThreeStatsHud() {
        if (!isEnabled()) {
            hudElement.style.display = "none";
            frameCount = 0;
            lastUpdateTime = performance.now();
            return;
        }

        frameCount += 1;
        hudElement.style.display = "block";

        const now = performance.now();
        const elapsed = now - lastUpdateTime;
        if (elapsed < 250) {
            return;
        }

        const fps = (frameCount * 1000) / elapsed;
        const { render, memory, programs } = renderer.info;

        hudElement.innerHTML = [
            `FPS: ${fps.toFixed(1)}`,
            `Draw calls: ${render.calls}`,
            `Tris: ${formatCompactNumber(render.triangles)}`,
            `Lines: ${formatCompactNumber(render.lines)}`,
            `Points: ${formatCompactNumber(render.points)}`,
            `Geometries: ${memory.geometries}`,
            `Textures: ${memory.textures}`,
            `Programs: ${programs ? programs.length : 0}`
        ].join("<br>");

        frameCount = 0;
        lastUpdateTime = now;
    };
}