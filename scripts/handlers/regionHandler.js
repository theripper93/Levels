import { DrawingHandler } from "./drawingHandler.js";

export class RegionHandler {
    static elevator(region, event, elevatorData) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation > top || elevation < bottom) return;
        DrawingHandler.renderElevatorDalog(elevatorData);
    }
    
    static stair(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation !== bottom && elevation !== top) return;
        RegionHandler.updateMovement(tokenDocument, elevation === top ? bottom : top);
    }

    static stairDown(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation > top || elevation <= bottom) return;
        RegionHandler.updateMovement(tokenDocument, bottom);
    }

    static stairUp(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation < bottom || elevation >= top) return;
        RegionHandler.updateMovement(tokenDocument, top);
    }

    static getRegionEventData(region, event) {
        return {
            top: region.elevation.top,
            bottom: region.elevation.bottom,
            tokenDocument: event.data.token,
            elevation: event.data.token.elevation,
        }
    }

    static updateMovement(tokenDocument, elevation){
        const position = tokenDocument.getSnappedPosition({...tokenDocument.movement.destination, elevation, action: "displace"});
        tokenDocument.stopMovement();
        tokenDocument.move([{...position, action: "displace"}], {...tokenDocument.movement});
    }

    static async waitForAnimation(tokenDocument, fn){
        const object = tokenDocument.object;
        const promises = Array.from(object.animationContexts.values()).map(a=>[a.promise, ...a.chain.map(c=>c.promise)]).flat();
        await Promise.all(promises);
        fn();
    }
}