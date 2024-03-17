export class NoteHandler {
    static isVisible(wrapped, ...args) {
        const result = wrapped(...args);
        const currentElevation = CONFIG.Levels.currentToken?.losHeight;
        const uiVisible = CONFIG.Levels.handlers.UIHandler.UIVisible(this) ?? true;
        if (currentElevation === undefined) return result && uiVisible;
        const isVisible = CONFIG.Levels.helpers.inRange(this.document, currentElevation);
        return result && isVisible && uiVisible;
    }
}
