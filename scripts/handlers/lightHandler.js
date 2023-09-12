export class LightHandler{
    static isLightVisibleWrapper(wrapped, ...args){
        const result = wrapped(...args);
        const isPreview = this.document?.id == null;
        if(isPreview) return result;
        if(!CONFIG.Levels.handlers.UIHandler.emitsLightUI(this)) return false;
        if (game.Levels3DPreview?._active) return result;
        const isToken = this instanceof Token;
        const rangeBottom = isToken ? this.document.elevation : this.document.flags.levels?.rangeBottom ?? -Infinity;
        const rangeTop = isToken ? this.losHeight : this.document.flags.levels?.rangeTop ?? Infinity;
        const currentElevation = CONFIG.Levels.currentToken?.losHeight
        if(currentElevation === undefined) return result;
        const underBackground = currentElevation >= canvas.primary.background.elevation && rangeTop < canvas.primary.background.elevation;
        if(underBackground) return false;
        let isLightVisible = false;
        if ((canvas.scene.flags.levels?.lightMasking ?? true)) {
            if (isToken) isLightVisible = true;//this.visible || rangeBottom <= currentElevation;
            else isLightVisible = rangeBottom <= currentElevation;
        } else {
            let inTokenElevationRange = false;
            if (isToken) {
                const currentTokenElevation = CONFIG.Levels.currentToken?.document?.elevation ?? currentElevation;
                inTokenElevationRange = rangeBottom <= currentTokenElevation && currentTokenElevation <= rangeTop;
            }
            isLightVisible = (rangeBottom <= currentElevation && currentElevation <= rangeTop) || inTokenElevationRange;
        }
        return result && isLightVisible;
    }
}