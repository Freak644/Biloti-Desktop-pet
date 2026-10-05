export function calculateEyeDirection(
    petX,
    petY,
    cursorX,
    cursorY,
    maxDistance = 10
) {
    const dx = cursorX - petX;
    const dy = cursorY - petY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
        return { x: 0, y: 0 };
    }

    const ratio = Math.min(maxDistance / distance, 1);

    return {
        x: dx * ratio,
        y: dy * ratio,
    };
}