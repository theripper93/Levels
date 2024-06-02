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
        tokenDocument.update({ elevation: elevation === top ? bottom : top }, {teleport: true});
    }

    static stairDown(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation > top || elevation <= bottom) return;
        tokenDocument.update({ elevation: bottom }, {teleport: true});
    }

    static stairUp(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation < bottom || elevation >= top) return;
        tokenDocument.update({ elevation: top }, {teleport: true});
    }

    static getRegionEventData(region, event) {
        return {
            top: region.elevation.top,
            bottom: region.elevation.bottom,
            tokenDocument: event.data.token,
            elevation: event.data.token.elevation,
        }
    }
}