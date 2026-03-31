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
            if (compendium.locked) {
                console.warn(`Levels - Compendium ${compendium.collection} is locked, skipping migration.`);
                continue;
            }
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

    getDocumentLevel(document) {
        if (document.documentName === "Wall") {
            const top = parseFloat(document.flags?.["wall-height"]?.top) ?? Infinity;
            const bottom = parseFloat(document.flags?.["wall-height"]?.bottom) ?? -Infinity;
            return { top, bottom };
        }
        if (document.documentName === "Region") {
            return document.elevation;
        }
        const bottom = document.elevation;
        const top = parseFloat(document.flags?.levels?.rangeTop ?? bottom);
        return { top, bottom };
    }

    async migrateData(scene) {
        if (!scene) scene = canvas.scene;
        const isLevelsScene = scene.flags.levels?.sceneLevels?.length || scene.walls.find(wall => wall.flags?.["wall-height"]?.top || wall.flags?.["wall-height"]?.bottom);
        if (!isLevelsScene) return;

        const firstLevel = scene.firstLevel;
        const collections = scene.collections;

        const tileToUpdate = [];
        for (const tile of scene.tiles) {
            const collisions = tile.flags?.levels?.noCollision === false;
            if (collisions) {
                tileToUpdate.push({
                    flags: {
                        levels: {
                            blockSightMovement: true,
                        }
                    }
                });
            }
        }
        await scene.updateEmbeddedDocuments("Tile", tileToUpdate);

        // Migrate drawings first
        await this.migrateDrawingsToRegions(scene);
        const existingLevels = scene.flags.levels?.sceneLevels?.map(level => {
            return {
                bottom: parseFloat(level[0]),
                top: parseFloat(level[1]),
                name: level[2],
            }
        }) ?? [];
        
        const inferredLevels = {};
        const orphanedDocuments = [];

        for (const [collectionName, collection] of Object.entries(collections)) {
            const documents = collection.contents;
            for (const document of documents) {
                const { bottom, top } = this.getDocumentLevel(document);
                if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
                    orphanedDocuments.push(document);
                    continue;
                };
                const key = `${bottom}${top}`;
                if (inferredLevels[key]) {
                    inferredLevels[key].documents.push(document);
                    continue;
                }
                inferredLevels[`${bottom}${top}`] = {
                    bottom,
                    top,
                    documents: [document]
                };
            }
        }
        const levelsToCreate = [];
        const levelsToMerge = [];
        const minRange = scene.grid.distance * 1.5;
        for (const level of Object.values(inferredLevels)) {
            const levelRange = level.top - level.bottom;
            if (levelRange < minRange) {
                levelsToMerge.push(level);
                continue;
            }
            const existingLevel = existingLevels.find(x => Math.round(x.bottom) == Math.round(level.bottom) && Math.round(x.top) == Math.round(level.top));
            level.name = existingLevel?.name || `${scene.name} - Level (${level.bottom}|${level.top})`;
            levelsToCreate.push(level);
        }
        for (const level of levelsToMerge) {
            const containingLevel = levelsToCreate.find(x => level.bottom >= x.bottom && level.top <= x.top);
            if (!containingLevel) {
                levelsToCreate.push(level);
                continue;
            }
            containingLevel.documents.push(...level.documents);
        }
        levelsToCreate.sort((a, b) => a.bottom - b.bottom);

        const createdLevels = await scene.createEmbeddedDocuments("Level", levelsToCreate.map(level => {
            return {
                name: level.name,
                elevation: {
                    bottom: level.bottom,
                    top: level.top,
                }
            }
        }));
        await scene.updateEmbeddedDocuments("Level", createdLevels.map(level => {
            return {
                _id: level.id,
                visibility: {
                    levels: createdLevels.filter(x => x.elevation.bottom <= level.elevation.bottom).map(x => x.id)
                }
            }
        }));
        createdLevels.sort((a, b) => a.elevation.bottom - b.elevation.bottom);
        const backgroundLevel = createdLevels.find(x => x.elevation.bottom === scene.flags.levels?.backgroundElevation) ?? createdLevels.find(x => x.elevation.bottom >= 0) ?? createdLevels[0];
        await backgroundLevel.update({
            background: {
                src: firstLevel.background.src,
            }
        });
        for (const level of levelsToCreate) {
            level.id = scene.levels.getName(level.name).id;
        }
        for (const level of levelsToCreate) {
            level.includedLevels = levelsToCreate.filter(x => level.bottom <= x.bottom && level.top >= x.top).map(x => x.id);
            level.belowLevels = levelsToCreate.filter(x => level.top >= x.top).map(x => x.id);
        }
        const includedWallDocuments = ["Wall", "Light"];
        const documentsToUpdate = {};
        for (const level of levelsToCreate) {
            for (const document of level.documents) {
                documentsToUpdate[document.documentName] ??= [];
                if (document.documentName === "Region") {
                    const includedLevels = levelsToCreate.filter(x => Number.between(document.elevation.bottom, x.bottom, x.top) || Number.between(document.elevation.top, x.bottom, x.top)).map(x => x.id);
                    documentsToUpdate[document.documentName].push({
                        _id: document.id,
                        levels: includedLevels
                    });
                    continue;
                }
                documentsToUpdate[document.documentName].push({
                    _id: document.id,
                    levels: includedWallDocuments.includes(document.documentName) ? level.includedLevels : level.belowLevels,
                });
            }
        }
        const allLevels = levelsToCreate.map(x => x.id);
        for (const orphan of orphanedDocuments) {
            documentsToUpdate[orphan.documentName] ??= [];
            documentsToUpdate[orphan.documentName].push({
                _id: orphan.id,
                levels: allLevels
            });
        }
        for (const [documentName, updates] of Object.entries(documentsToUpdate)) {
            await scene.updateEmbeddedDocuments(documentName, updates);
        }
        await scene.update({
            name: "Updated",
        })
        await firstLevel.delete();
        const msg = "Levels Module - Migrated scene to Core Foundry Levels";
        ui.notifications.success(msg);
        console.log(msg);
    }

    async inferSceneLevels(scene) {}

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
            if (!drawing.flags?.levels?.drawingMode || drawing.shape.type !== "r") continue;
            if (drawing.flags?.levels?.drawingMode == 1) {
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
            const scriptSource = regionSourceCodeMapping[drawing.flags.levels?.drawingMode.toString()];
            if (!scriptSource) continue;
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
