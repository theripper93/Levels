/*
This is internal code not currently used for the future V11 -> V12 migration
For every document in the collection, we want to migrate "flags.levels.rangeBottom" to the new core "elevation" property.
*/

const regionSourceCodeMapping = {
    "2": `CONFIG.Levels.handlers.RegionHandler.stair(region,event);\n//Check the wiki page for more region options https://wiki.theripper93.com/levels#regions`,
    "3": `CONFIG.Levels.handlers.RegionHandler.elevator(region,event,elevatorData);`,
    "21": `CONFIG.Levels.handlers.RegionHandler.stairDown(region,event);`,
    "22": `CONFIG.Levels.handlers.RegionHandler.stairUp(region,event);`,
}

export class LevelsMigration {
    constructor() { }

    async migrateCompendiums() {
        let migratedScenes = 0;
        const compendiums = Array.from(game.packs).filter((p) => p.documentName === "Scene");
        for (const compendium of compendiums) {
            const scenes = await compendium.getDocuments();
            for (const scene of scenes) {
                const migrated = await this.migrateData(scene);
                if (migrated) migratedScenes++;
            }
        }
        if (migratedScenes > 0) {
            ui.notifications.notify(`Levels - Migrated ${migratedScenes} scenes in compendiums to new elevation data structure.`);
            console.log(`Levels - Migrated ${migratedScenes} scenes in compendiums to new elevation data structure.`);
        } else {
            ui.notifications.notify(`Levels - No scenes in compendiums to migrate.`);
            console.log(`Levels - No scenes in compendiums to migrate.`);
        }
        return migratedScenes;
    }

    async migrateScenes() {
        const scenes = Array.from(game.scenes);
        let migratedScenes = 0;
        ui.notifications.warn("Levels - Migrating all scenes, do not refresh the page!");
        for (const scene of scenes) {
            const migrated = await this.migrateData(scene);
            if (migrated) migratedScenes++;
        }
        if (migratedScenes > 0) {
            ui.notifications.notify(`Levels - Migrated ${migratedScenes} scenes to new elevation data structure.`);
            console.log(`Levels - Migrated ${migratedScenes} scenes to new elevation data structure.`);
        } else {
            ui.notifications.notify(`Levels - No scenes to migrate.`);
            console.log(`Levels - No scenes to migrate.`);
        }
        return migratedScenes;
    }

    async migrateAll() {
        ui.notifications.warn("Levels - Migrating all scenes, do not refresh the page!");
        await this.migrateScenes();
        await this.migrateCompendiums();
        ui.notifications.notify(`Levels - Migration Complete.`);
        await game.settings.set("levels", "migrateOnStartup", false);
    }

    async migrateData(scene) {
        if (!scene) scene = canvas.scene;

        const collections = scene.collections;

        for (const [collectionName, collection] of Object.entries(collections)) {
            const documents = collection.contents;
            const updates = [];
            for (const document of documents) {
                const oldBottom = document.flags?.levels?.rangeBottom;
                let update = {};
                if (Number.isNumeric(oldBottom)) {
                    update = {
                        _id: document.id,
                        elevation: oldBottom,
                        flags: {
                            levels: {
                                "-=rangeBottom": null,
                            },
                        },
                    };
                    if (documents[0].documentName === "Drawing") {
                        update.interface = false;
                    }
                    updates.push(update);
                }
            }
            if (updates.length <= 0) continue;
            await scene.updateEmbeddedDocuments(documents[0].documentName, updates);
            ui.notifications.notify("Levels - Migrated " + updates.length + " " + collectionName + "s to new elevation data structure in scene " + scene.name);
            console.log("Levels - Migrated " + updates.length + " " + collectionName + " to new elevation data structure in scene " + scene.name);
        }
    }

    async migrateDrawingsToRegions(scene) {
        if (!scene) scene = canvas.scene;

        const baseRegionData = {
            "color": "#fe6c0b",
            "elevation": {
            },
            "behaviors": [
                {
                    "name": "Execute Script",
                    "type": "executeScript",
                    "system": {
                        "events": [
                            "tokenEnter"
                        ]
                    },
                }
            ]
        };

        const drawings = scene.drawings.contents;
        const regionsData = [];
        const toDelete = [];
        let migratedCount = 0;
        for (const drawing of drawings) {
            if(!drawing.flags?.levels?.drawingMode || drawing.shape.type !== "r") continue;
            if(drawing.flags?.levels?.drawingMode == 1){
                toDelete.push(drawing.id);
                continue;
            }
            const bottom = drawing.elevation;
            const top = drawing.flags.levels?.rangeTop;
            const elevatorFloors = drawing.flags.levels?.elevatorFloors;
            if (!Number.isNumeric(bottom) || !Number.isNumeric(top)) continue;
            const name = drawing.text || "Levels Stair " + parseFloat(bottom) + "-" + parseFloat(top);
            const regionData = foundry.utils.deepClone(baseRegionData);
            regionData.name = name;
            regionData.elevation.bottom = parseFloat(bottom);
            regionData.elevation.top = parseFloat(top) + 1;
            const scriptSource= regionSourceCodeMapping[drawing.flags.levels?.drawingMode.toString()];
            if(!scriptSource) continue;
            regionData.behaviors[0].system.source = scriptSource.replace("elevatorData", `"${elevatorFloors}"`)
            regionData.shapes = [
                {
                    "type": "rectangle",
                    "x": drawing.x,
                    "y": drawing.y,
                    "width": drawing.shape.width,
                    "height": drawing.shape.height,
                    "rotation": 0,
                    "hole": false
                }
            ];
            migratedCount++;
            regionsData.push(regionData);
            toDelete.push(drawing.id);
        }
        await scene.createEmbeddedDocuments("Region", regionsData);
        await scene.deleteEmbeddedDocuments("Drawing", toDelete);
        ui.notifications.notify("Levels - Migrated " + migratedCount + " drawings to regions in scene " + scene.name);
        console.log("Levels - Migrated " + migratedCount + " drawings to regions in scene " + scene.name);
        return migratedCount;
    }

    showManualMigrationDialog() {
        //shows a dialog with buttons for migrating current scene, all scenes, or all scenes in compendiums
        new Dialog({
            title: "Levels - Migration",
            content: `<p>Use this dialog to migrate your scenes to the new elevation data structure. This is required for Levels to function properly in V12.</p>
            <p><b>WARNING:</b> This will modify your scene data. Please back up your world before proceeding.</p>`,
            buttons: {
                scene: {
                    label: "Migrate Current Scene",
                    callback: () => this.migrateData(),
                },
                sidebar: {
                    label: "Migrate All Sidebar Scenes",
                    callback: () => this.migrateScenes(),
                },
                compendiums: {
                    label: "Migrate All Scenes in Compendiums",
                    callback: () => this.migrateCompendiums(),
                },
                all: {
                    label: "Migrate All Scenes in Compendiums and Sidebar",
                    callback: () => this.migrateAll(),
                },

            },
            default: "scene",
        }).render(true);
    }
}
