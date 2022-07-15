export class NoteHandler{
    static isVisible(wrapped, ...args){
        const result = wrapped(...args);
        const currentElevation = CONFIG.Levels.currentToken?.losHeight
        if(currentElevation === undefined) return result;
        const isVisible = CONFIG.Levels.helpers.inRange(this.document, currentElevation);
        return result && isVisible;
    }
}