import {adjustPolygonPoints} from "../helpers.js";

let lastDialog = null;

export class DrawingHandler {
    static isDrawingVisible(drawing) {
        const currentElevation = CONFIG.Levels.currentToken?.losHeight;
        const rangeBottom = drawing.document.elevation ?? -Infinity;
        if (currentElevation === undefined) return true;
        const isVisible = rangeBottom <= currentElevation;
        return isVisible;
    }

    static executeStairs(updates, token) {
        if ("x" in updates || "y" in updates) {
            let stairs = this.getStairs();
            let tokenX = updates.x || token.x;
            let tokenY = updates.y || token.y;
            let newUpdates;
            let tokenElev = updates.elevation || token.elevation;
            let gridSize = canvas.scene.dimensions.size;
            let newTokenCenter = {
                x: tokenX + (gridSize * token.width) / 2,
                y: tokenY + (gridSize * token.height) / 2,
            };
            let inStair;
            for (let stair of stairs) {
                if (stair.poly.contains(newTokenCenter.x, newTokenCenter.y)) {
                    if (token.inStair == stair.drawing.id) {
                        inStair = stair.drawing.id;
                    } else {
                        if (stair.drawingMode == 2) {
                            if (tokenElev <= stair.range[1] && tokenElev >= stair.range[0]) {
                                if (tokenElev == stair.range[1]) {
                                    inStair = stair.drawing.id;
                                    newUpdates = { elevation: stair.range[0] };
                                }
                                if (tokenElev == stair.range[0]) {
                                    inStair = stair.drawing.id;
                                    newUpdates = { elevation: stair.range[1] };
                                }
                            }
                        } else if (stair.drawingMode == 21) {
                            if (tokenElev <= stair.range[1] && tokenElev >= stair.range[0]) {
                                if (tokenElev == stair.range[1]) {
                                    inStair = stair.drawing.id;
                                    newUpdates = { elevation: stair.range[0] };
                                }
                            }
                        } else if (stair.drawingMode == 22) {
                            if (tokenElev <= stair.range[1] && tokenElev >= stair.range[0]) {
                                if (tokenElev == stair.range[0]) {
                                    inStair = stair.drawing.id;
                                    newUpdates = { elevation: stair.range[1] };
                                }
                            }
                        } else if (stair.drawingMode == 3) {
                            if (tokenElev <= stair.range[1] && tokenElev >= stair.range[0]) {
                                CONFIG.Levels.handlers.DrawingHandler.renderElevatorDalog(stair.drawing.document.getFlag(CONFIG.Levels.MODULE_ID, "elevatorFloors"), token);
                                inStair = stair.drawing.id;
                            }
                        }
                    }
                } else {
                    inStair = inStair || false;
                }
            }
            token.inStair = inStair;
            if (!inStair) {
                DrawingHandler.closeElevatorDialog();
            }
            if (newUpdates) {
                newUpdates.flags ??= {};
                newUpdates.flags.levels ??= {};
                newUpdates.flags.levels.stairUpdate = true;
                Hooks.once("updateToken", (token, updates) => {
                    const animation = canvas.tokens.get(token.id)?._animation;
                    if (animation) {
                        animation.then(() => token?.update(newUpdates));
                    } else {
                        token?.update(newUpdates);
                    }
                });
            }
        }
    }

    static getStairs() {
        let stairs = [];
        for (let drawing of canvas.drawings.placeables) {
            let { rangeBottom, rangeTop, drawingMode } = this.getFlagsForObject(drawing);
            let isLocked = drawing.document.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked");
            if ((drawingMode == 2 || drawingMode == 3 || drawingMode == 21 || drawingMode == 22) && rangeBottom != -Infinity && rangeTop != Infinity && !isLocked) {
                let p = new PIXI.Polygon(adjustPolygonPoints(drawing));
                stairs.push({
                    drawing: drawing,
                    poly: p,
                    range: [rangeBottom, rangeTop + 1],
                    drawingMode: drawingMode,
                });
            }
        }
        return stairs;
    }

    static closeElevatorDialog() {
        if (lastDialog) lastDialog.close();
        lastDialog = null;
    }

    static async renderElevatorDalog(levelsFlag) {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        let elevatorFloors = [];
        levelsFlag.split("|").forEach((f) => {
            elevatorFloors.push(f.split(","));
        });

        let content = `<div id="levels-elevator">`;

        elevatorFloors.forEach((f) => {
            content += `<div class="button" type="button">
                            <button id="${f[0]}" class="elevator-level">${f[1]}</button>
                </div>`;
        });
        content += `</div>`;

        let dialog = new foundry.applications.api.DialogV2({
            window: {title: game.i18n.localize("levels.dialog.elevator.title")},
            content: content,
            buttons: [
                {
                    label: game.i18n.localize("levels.yesnodialog.no"),
                    callback: () => {},
                },
            ],
            default: "close",
            close: () => {},
        });
        lastDialog = dialog;
        await dialog.render(true);

        const html = dialog.element;
        html.querySelector(".form-footer").style.display = "none";
        const buttons = html.querySelectorAll("#levels-elevator button");
        buttons.forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                let newElev = parseFloat(event.target.id);
                if (newElev || newElev == 0) canvas.tokens.controlled[0]?.document?.update({ elevation: newElev }, {teleport: true});
            });
        });
    }

    static getFlagsForObject(drawing) {
        return {
            rangeBottom: drawing.document.elevation ?? -Infinity,
            rangeTop: drawing.document.flags?.levels?.rangeTop ?? Infinity,
            drawingMode: drawing.document.flags?.levels?.drawingMode ?? 0,
        };
    }
}
