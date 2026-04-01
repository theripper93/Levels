// import { DrawingHandler } from "./drawingHandler.js";

export class RegionHandler {
    static elevator(region, event, elevatorData) {
        if (game.user !== event.user) return;
        const { top, bottom, tokenDocument, elevation, movement } = this.getRegionEventData(region, event);
        if (elevation > top || elevation < bottom) return;
        // DrawingHandler.renderElevatorDalog(elevatorData);
    }

    static stair(region, event) {
        if (game.user !== event.user) return;
        const { tokenDocument, tokenLevel } = this.getRegionEventData(region, event);
        const levelDown = region.levels.find(x => Math.round(tokenLevel.elevation.bottom) === Math.round(x.top));
        if (levelDown) return tokenDocument.update({ level: levelDown._id });
        const levelUp = region.levels.find(x => Math.round(tokenLevel.elevation.top) === Math.round(x.bottom));
        if (levelUp) return tokenDocument.update({ level: levelUp._id });
    }

    static stairDown(region, event) {
        if (game.user !== event.user) return;
        const { tokenDocument, tokenLevel } = this.getRegionEventData(region, event);
        if (!tokenLevel) return;
        const levelDown = region.levels.find(x => Math.round(tokenLevel.elevation.bottom) === Math.round(x.top));
        if (levelDown) return tokenDocument.update({ level: levelDown._id });
    }

    static stairUp(region, event) {
        if (game.user !== event.user) return;
        const { tokenDocument, tokenLevel } = this.getRegionEventData(region, event);
        if (!tokenLevel) return;
        const levelUp = region.levels.find(x => Math.round(tokenLevel.elevation.top) === Math.round(x.bottom));
        if (levelUp) return tokenDocument.update({ level: levelUp._id });
    }

    static getRegionEventData(region, event) {
        return {
            top: region.elevation.top,
            bottom: region.elevation.bottom,
            tokenDocument: event.data.token,
            elevation: event.data.token.elevation,
            movement: event.data.movement,
            tokenLevel: canvas.scene.levels.get(event.data.token.level),
        }
    }

    static async updatePendingMovementElevation(region, event, elevation){
        const { tokenDocument, movement } = this.getRegionEventData(region, event);
        return this.updateMovement(tokenDocument, elevation, movement);
    }

    static async updateMovement(tokenDocument, elevation, movement) {
        tokenDocument.stopMovement();
        if (tokenDocument.rendered) await tokenDocument.object.movementAnimationPromise;
        const adjustedWaypoints = movement.pending.waypoints.filter(w => !w.intermediate).map(w => ({ ...w, elevation, action: "displace" }));
        await tokenDocument.move(adjustedWaypoints, {
            ...movement.updateOptions,
            constrainOptions: movement.constrainOptions,
            autoRotate: movement.autoRotate,
            showRuler: movement.showRuler
        });
    }

    static async waitForAnimation(tokenDocument, fn) {
        const object = tokenDocument.object;
        const promises = Array.from(object.animationContexts.values()).map(a => [a.promise, ...a.chain.map(c => c.promise)]).flat();
        await Promise.all(promises);
        fn();
    }
}