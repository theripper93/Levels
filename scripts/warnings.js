

export function setupWarnings() {
    Hooks.on("controlToken", (token, controlled) => {
        if (!controlled || !CONFIG.Levels?.UI?.rendered) return;
        
        const {bottom, top} = CONFIG.Levels.UI.currentRange;
        const tokenElevation = token.document.elevation;
        const losHeight = token.losHeight;

        if (tokenElevation < bottom || losHeight >= top) {
            ui.notifications.error(game.i18n.localize("levels.err.tokenOOB").replace("%n", token.document.name), {permanent: true});
        }
    });
}