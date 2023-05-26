export class SoundHandler{
    static isAudible(wrapped, ...args) {
        const result = wrapped(...args);
        const currentElevation = WallHeight.currentTokenElevation
        if (currentElevation === null || currentElevation === undefined) return result;
        let inRange;
        if (game.Levels3DPreview?._active) {
            inRange = canvas.tokens.placeables.some((t) => CONFIG.Levels.helpers.inDistance(t, this, this.radius)) ;
        } else {
            inRange = CONFIG.Levels.helpers.inRange(this.document, currentElevation);
        }
        return result && inRange;
    }
}