export class ViewportMapper {
    constructor(containerElement) {
        this.container = containerElement;
    }

    getDimensions() {
        return this.container.getBoundingClientRect();
    }

    /**
     * Map normalized MediaPipe coordinates (0.0 to 1.0) to actual DOM screen space
     * Note: Inverts X because webcam video is usually mirrored.
     */
    toScreenSpace(normX, normY) {
        const rect = this.getDimensions();
        return {
            x: (1 - normX) * rect.width,
            y: normY * rect.height
        };
    }

    /**
     * Map normalized coordinates to Normalized Device Coordinates (NDC) for Raycasting (-1 to 1)
     */
    toNDC(normX, normY) {
        // First map to screen
        const screen = this.toScreenSpace(normX, normY);
        const rect = this.getDimensions();
        
        return {
            x: (screen.x / rect.width) * 2 - 1,
            y: -(screen.y / rect.height) * 2 + 1
        };
    }

    /**
     * Calculate delta between two normalized points in screen space
     */
    calculateScreenDelta(prevNormX, prevNormY, currNormX, currNormY) {
        if (prevNormX === null || prevNormY === null) return { dx: 0, dy: 0 };
        
        const prev = this.toScreenSpace(prevNormX, prevNormY);
        const curr = this.toScreenSpace(currNormX, currNormY);
        
        return {
            dx: curr.x - prev.x,
            dy: curr.y - prev.y
        };
    }
}
