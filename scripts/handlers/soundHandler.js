export class SoundHandler{
    static isAudible(wrapped, ...args) {
        const result = wrapped(...args);
        const currentElevation = WallHeight.currentTokenElevation
        if(currentElevation === null || currentElevation === undefined) return result;
        const inRange = CONFIG.Levels.helpers.inRange(this.document, currentElevation);
        return result && inRange;
    }
}