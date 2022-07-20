export class LightHandler{
    static isLightVisibleWrapper(wrapped, ...args){
        const result = wrapped(...args);
        const rangeBottom = this.document.flags.levels?.rangeBottom ?? -Infinity;
        const rangeTop = this.document.flags.levels?.rangeTop ?? Infinity;
        const currentElevation = CONFIG.Levels.currentToken?.losHeight
        if(currentElevation === undefined) return result;
        const isLightVisible = rangeBottom <= currentElevation// && currentElevation <= rangeTop;
        return result && isLightVisible;
    }
}