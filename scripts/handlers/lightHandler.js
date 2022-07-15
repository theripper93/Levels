export class LightHandler{
    static isLightVisibleWrapper(wrapped, ...args){
        const result = wrapped(...args);
        const rangeBottom = this.document.flags.levels?.rangeBottom ?? -Infinity;
        const currentElevation = CONFIG.Levels.currentToken?.losHeight
        if(currentElevation === undefined) return result;
        const isLightVisible = rangeBottom <= currentElevation;
        return result && isLightVisible;
    }
}