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
        RegionHandler.waitForAnimation(tokenDocument, () => tokenDocument.update(...RegionHandler.generateUpdateArgs(elevation === top ? bottom : top)))
    }

    static stairDown(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation > top || elevation <= bottom) return;
        RegionHandler.waitForAnimation(tokenDocument, () => tokenDocument.update(...RegionHandler.generateUpdateArgs(bottom)));
    }

    static stairUp(region, event) {
        if(game.user !== event.user) return;
        const {top, bottom, tokenDocument, elevation} = this.getRegionEventData(region, event);
        if (elevation < bottom || elevation >= top) return;
        RegionHandler.waitForAnimation(tokenDocument, () => tokenDocument.update(...RegionHandler.generateUpdateArgs(top)));
    }

    static getRegionEventData(region, event) {
        return {
            top: region.elevation.top,
            bottom: region.elevation.bottom,
            tokenDocument: event.data.token,
            elevation: event.data.token.elevation,
        }
    }

    static generateUpdateArgs(elevation){
        const waypoints = [{action: "displace", elevation}];
        return [{elevation}, {waypoints}];
    }

    static async waitForAnimation(tokenDocument, fn){
        const object = tokenDocument.object;
        const promises = Array.from(object.animationContexts.values()).map(a=>[a.promise, ...a.chain.map(c=>c.promise)]).flat();
        await Promise.all(promises);
        //sleep 100ms
        await new Promise(resolve => setTimeout(resolve, 250));
        fn();
    }
}