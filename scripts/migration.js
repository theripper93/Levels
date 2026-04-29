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

    async migrateData(scene, force = false) {
        if (!scene) scene = canvas.scene;
        const isLevelsScene = scene.flags.levels?.sceneLevels?.length || scene.walls.find(wall => wall.flags?.["wall-height"]?.top || wall.flags?.["wall-height"]?.bottom);
        if (!isLevelsScene) return;
        const is3DScene = scene.flags["levels-3d-preview"]?.enablePlayers ||
            scene.flags["levels-3d-preview"]?.auto3d ||
            scene.flags["levels-3d-preview"]?.object3dSight;
        if (is3DScene) return;
        if (scene.getFlag("levels", "sceneLevelsMigration") && !force) return;

        const firstLevel = scene.levels.get("defaultLevel0000");
        const collections = scene.collections;

        const tileToUpdate = [];
        for (const tile of scene.tiles) {
            const collisions = tile.flags?.levels?.noCollision === false;
            if (collisions) {
                tileToUpdate.push({
                    _id: tile.id,
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
            const bottom = Number.isFinite(parseFloat(level[0])) ? parseFloat(level[0]) : 0;
            const top = Number.isFinite(parseFloat(level[1])) ? parseFloat(level[1]) : bottom + scene.dimensions.distance * 2;
            return {
                bottom: bottom,
                top: top,
                name: level[2],
            }
        }) ?? [];

        const fastForwardMigration = game.settings.get("levels", "fastForwardMigration");
        
        const inferredLevels = {};
        const orphanedDocuments = [];

        const transformedLevelsKeys = {};
        for (const [collectionName, collection] of Object.entries(collections)) {
            const documents = collection.contents;
            for (const document of documents) {
                if (document instanceof Level) continue;
                if (document instanceof Tile && !document.flags?.levels) continue;
                let { bottom, top } = this.getDocumentLevel(document);
                if (transformedLevelsKeys[`${bottom}${top}`]) {
                    const key = `${bottom}${top}`;
                    bottom = transformedLevelsKeys[key].bottom;
                    top = transformedLevelsKeys[key].top;
                    document.overriddenElevation = document.elevation > top ? top : bottom;
                }
                if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
                    orphanedDocuments.push(document);
                    continue;
                };
                const key = `${bottom}${top}`;
                if (inferredLevels[key]) {
                    inferredLevels[key].documents.push(document);
                    continue;
                }
                const isContained = existingLevels.find(x => x.bottom <= bottom && x.top >= top);
                if (existingLevels.length && !isContained && !fastForwardMigration) {
                    let skipScene = false;
                    let msg = `
                        Found ${document.documentName} with level ${bottom}|${top} in scene ${scene.name}.
                        This placeable has no matching level. Choose how you want to proceed.
                        <code-mirror language="javascript">// Macro to manually migrate ${scene.name}\nCONFIG.Levels.helpers.migration.migrateData(await fromUuid("${scene.uuid}"));</code-mirror>
                    `;
                    await foundry.applications.api.DialogV2.wait({
                        window: { title: "Levels - Migration" },
                        content: msg,
                        buttons: [
                            {
                                label: "Skip scene",
                                action: "skipScene",
                                callback: () => skipScene = true,
                            },
                            {
                                label: "Generate level from document top and bottom",
                                action: "generateTopBottom",
                                callback: () => {},
                            },
                            ...existingLevels.map((level, index) => {
                                return {
                                    label: `Add to ${level.name} (${level.bottom}|${level.top})`,
                                    action: `addToLevel${index}`,
                                    callback: () => {
                                        transformedLevelsKeys[`${bottom}${top}`] = { top: level.top, bottom: level.bottom };
                                        document.overriddenElevation = document.elevation > level.top ? level.top : level.bottom;
                                        bottom = level.bottom;
                                        top = level.top;
                                    },
                                }
                            }),
                        ],
                    });
                    if (skipScene) return;
                }
                if (`${bottom}${top}` in inferredLevels) {
                    inferredLevels[`${bottom}${top}`].documents.push(document);
                } else {
                    inferredLevels[`${bottom}${top}`] = {
                        name: `${scene.name} - Level (${bottom}|${top})`,
                        bottom,
                        top,
                        documents: [document]
                    };
                }
            }
        }
        const levelsWithContent = [];
        const levelsToMerge = [];
        const minRange = scene.grid.distance * 1.5;
        for (const level of Object.values(inferredLevels)) {
            const levelRange = level.top - level.bottom;
            level.size = levelRange;
            const existingLevel = existingLevels.find(x => Math.round(x.bottom) == Math.round(level.bottom) && Math.round(x.top) == Math.round(level.top));
            level.originalName = existingLevel?.name;
            if (levelRange < minRange) {
                levelsToMerge.push(level);
                continue;
            }
            let isContained = false;
            for (const maybeContainingLevel of Object.values(inferredLevels)) {
                const maybeContainingRange = maybeContainingLevel.top - maybeContainingLevel.bottom;
                const touches = level.bottom === maybeContainingLevel.bottom || level.top === maybeContainingLevel.top;
                const isSmaller = levelRange > maybeContainingRange * 0.8 && levelRange < maybeContainingRange;
                if (touches && isSmaller) {
                    levelsToMerge.push(level);
                    isContained = true;
                }
            }
            if (isContained) continue;
            level.name = existingLevel?.name || `${scene.name} - Level (${level.bottom}|${level.top})`;
            levelsWithContent.push(level);
        }
        for (const level of levelsToMerge) {
            const containingLevel = levelsWithContent.filter(x => level.bottom >= x.bottom && level.top <= x.top).sort((a, b) => a.size - b.size)?.[0];
            if (!containingLevel) {
                levelsWithContent.push(level);
                continue;
            }
            if (level.originalName) containingLevel.name = level.originalName;
            containingLevel.documents.push(...level.documents);
        }
        levelsWithContent.sort((a, b) => a.bottom - b.bottom);

        const existingSceneLevels = scene.levels.contents.filter(x => x !== firstLevel);
        const levelsToCreate = levelsWithContent.filter(x => !existingSceneLevels.find(y => y.elevation.bottom === x.bottom && y.elevation.top === x.top));

        const createdLevels = await scene.createEmbeddedDocuments("Level", levelsToCreate.map(level => {
            return {
                name: level.name,
                elevation: {
                    bottom: level.bottom,
                    top: level.top,
                }
            }
        }));
        await scene.updateEmbeddedDocuments("Level", scene.levels.map(level => {
            return {
                _id: level.id,
                visibility: {
                    levels: scene.levels.filter(x => x.elevation.bottom <= level.elevation.bottom).map(x => x.id)
                }
            }
        }));
        createdLevels.sort((a, b) => a.elevation.bottom - b.elevation.bottom);
        existingSceneLevels.sort((a, b) => a.elevation.bottom - b.elevation.bottom);

        const backgroundElevation = scene.flags.levels?.backgroundElevation;
        const foundBackgroundLevel = createdLevels.find(x => x.elevation.bottom === backgroundElevation) ?? existingSceneLevels.find(x => x.elevation.bottom === backgroundElevation);
        const backgroundLevel = foundBackgroundLevel ??
        (Number.isFinite(backgroundElevation) ? createdLevels[0] : createdLevels.find(x => x.elevation.bottom >= 0))
        ?? createdLevels[0] ?? existingSceneLevels[0];
        const bgElevation = backgroundLevel.elevation.bottom;
        
        if (firstLevel) {
            await backgroundLevel.update({
                background: {
                    src: firstLevel.background.src,
                }
            });
        }

        for (const level of levelsWithContent) {
            level.id = scene.levels.getName(level.name).id;
        }
        for (const level of levelsWithContent) {
            level.includedLevels = levelsWithContent.filter(x => level.bottom <= x.bottom && level.top >= x.top).map(x => x.id);
            level.belowLevels = levelsWithContent.filter(x => level.top >= x.top).map(x => x.id);
            level.aboveLevels = levelsWithContent.filter(x => level.bottom <= x.bottom).map(x => x.id);
            level.allLevels = levelsWithContent.map(x => x.id);
        }
        const includedWallDocuments = ["Wall", "Light"];
        const documentsToUpdate = {};
        for (const level of levelsWithContent) {
            for (const document of level.documents) {
                documentsToUpdate[document.documentName] ??= [];
                if (document.documentName === "Region") {
                    const levelsToAdd = [];
                    const elevation = {};
                    for (const behavior of document.behaviors) {
                        if (behavior.type !== "executeScript") continue;
                        const script = behavior.system.source;
                        const top = document.elevation.top;
                        const bottom = document.elevation.bottom;
                        const regionBottomLevels = document.parent.levels.filter(x => x.elevation.bottom === bottom);
                        const regionTopLevels = document.parent.levels.filter(x => x.elevation.bottom === top);
                        if (script.includes("CONFIG.Levels.handlers.RegionHandler.stair(")) {
                            levelsToAdd.push(...regionBottomLevels, ...regionTopLevels);
                        } else if (script.includes("CONFIG.Levels.handlers.RegionHandler.stairDown")) {
                            levelsToAdd.push(...regionBottomLevels, ...regionTopLevels);
                            const delta = top - bottom;
                            elevation.bottom = bottom + delta;
                            elevation.top = (top + delta) * 0.9;
                        } else if (script.includes("CONFIG.Levels.handlers.RegionHandler.stairUp")) {
                            levelsToAdd.push(...regionBottomLevels, ...regionTopLevels);
                            elevation.top = top * 0.9;
                        } else if (script.includes("CONFIG.Levels.handlers.RegionHandler.elevator")) {
                            const elevatorBottoms = script.match(/(-?\d+)(?=,)/g).map(x => parseFloat(x));
                            const elevatorLevels = document.parent.levels.filter(x => elevatorBottoms.includes(x.elevation.bottom));
                            levelsToAdd.push(...elevatorLevels);
                        } else {
                            continue;
                        }
                        await behavior.delete();
                    };
                    if (levelsToAdd.length) {
                        await document.update({
                            behaviors: [{ type: "changeLevel" }],
                            elevation,
                        });
                    }
                    const includedLevels = levelsWithContent.filter(x => Number.between(document.elevation.bottom, x.bottom, x.top) || Number.between(document.elevation.top, x.bottom, x.top)).map(x => x.id);
                    documentsToUpdate[document.documentName].push({
                        _id: document.id,
                        levels: levelsToAdd.length ? levelsToAdd : includedLevels
                    });
                    continue;
                }
                if (document.documentName === "Tile" && document.flags.levels) {
                    const { rangeTop, showIfAbove, showAboveRange, isBasement } = document.flags.levels || {};
                    const update = { _id: document.id, levels: [] };
                    const elevation = document.overriddenElevation ?? document.elevation;
                    if (isBasement) {
                        update.levels = level.includedLevels;
                    } else if (showIfAbove && showAboveRange) {
                        const minElevation = elevation - showAboveRange;
                        update.levels = levelsWithContent.filter(x => x.top > minElevation).map(x => x.id);
                    } else if (!Number.isFinite(rangeTop)) {
                        const showAboveRangeBg = elevation - bgElevation;
                        if (showAboveRangeBg < 0) {
                            update.levels = level.allLevels;
                        } else {
                            const minElevation = elevation - showAboveRangeBg;
                            update.levels = levelsWithContent.filter(x => x.top > minElevation).map(x => x.id);
                        }
                    } else {
                        update.levels = level.aboveLevels;
                    }
                    update.flags = { "-=levels": null };
                    documentsToUpdate[document.documentName].push(update);
                    continue;
                }
                if (document.documentName === "Token") {
                    documentsToUpdate[document.documentName].push({
                        _id: document.id,
                        level: level.id,
                    });
                    continue;
                }
                documentsToUpdate[document.documentName].push({
                    _id: document.id,
                    flags: { "-=levels": null },
                    levels: includedWallDocuments.includes(document.documentName) ? level.includedLevels : level.aboveLevels,
                });
            }
        }
        const allLevels = levelsWithContent.map(x => x.id);
        for (const orphan of orphanedDocuments) {
            documentsToUpdate[orphan.documentName] ??= [];
            documentsToUpdate[orphan.documentName].push({
                _id: orphan.id,
                flags: { "-=levels": null },
                levels: allLevels
            });
        }
        for (const [documentName, updates] of Object.entries(documentsToUpdate)) {
            await scene.updateEmbeddedDocuments(documentName, updates);
        }
        if (firstLevel) await firstLevel.delete();
        await scene.setFlag("levels", "sceneLevelsMigration", true);
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
        const msg = `
        <div class="scrollable" style="width: 900px; max-width: 80vw; max-height: 70vh;">
            <h3>Thank you for using the Levels Module</h3>
            <p>After 5 years, its functionality has been implemented into core Foundry VTT as the <strong>Scene Levels</strong> feature, and the module is now being retired. The current version will attempt to migrate your scenes automatically, though some manual adjustments may be needed as the two implementations do not match 1:1.</p>
            <ul>
            <li><strong>Block Sight and Movement:</strong> The tile option has been ported to V14 and will continue to work on existing Levels tiles. Core Scene Levels does not use tiles for this purpose; you will need to use <strong>Regions</strong> and the <strong>Define Surface</strong> behavior instead.</li>
            <li><strong>Migration:</strong> You can re-run the scene migration utility at any time via the <strong>"Migrate on Startup"</strong> module setting.</li>
            </ul>
            <p class="notification warning">Make sure to backup your world before proceeding with the migration.</p>
            <h3>A 3D World - now free for everyone!</h3>
            <p>If you enjoyed this early tech, it is time to take a look at <strong>3D Canvas</strong>, the true evolution of vertical combat! To celebrate Levels' retirement, 3D Canvas is now free for everyone. Check out the video below and <a href="https://foundryvtt.com/packages/levels-3d-preview">download the module</a>.</p>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/oOAusysEiXw?si=k0WEx27iRdhi7Qne" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe>
            <h3 id="wall-height">Wall Height</h3>
            <p>Wall Height has also been retired. In V14, walls can be assigned to levels that define their top and bottom elevation rather than setting it individually per wall. The behavior is similar but not a 1:1 replacement.</p>
            <h3 id="support">Support</h3>
            <p>For help with Scene Levels, please refer to the Foundry VTT Discord, as it is now vanilla Foundry VTT functionality.</p>
            <p>The features listed above will be supported through V14, but should be considered unsupported as of V15. You should migrate your tiles to regions with the <strong>Define Surface</strong> behavior and your stair regions to the new <strong>Change Level</strong> behavior for any scenes you plan to keep using.</p>
            <h3 id="going-forward">Going Forward</h3>
            <p>It has been a pleasure to pioneer this feature so many years ahead of its time, with all the challenges of building it on top of a system that did not natively support it. I hope it served as inspiration to the Foundry team.</p>
        </div>
        `;
        new foundry.applications.api.DialogV2({
            window: { title: "Levels - Migration" },
            content: msg,
            buttons: [
                {
                    label: "Migrate All",
                    action: "all",
                    callback: () => this.migrateAll(),
                },
                {
                    label: "Migrate Scene",
                    action: "scene",
                    callback: () => this.migrateData(),
                },
                {
                    label: "Migrate All Scenes",
                    action: "scenes",
                    callback: () => this.migrateScenes(),
                },
                {
                    label: "Migrate Compendiums",
                    action: "compendiums",
                    callback: () => this.migrateCompendiums(),
                },
                {   
                    label: "Don't Show Again",
                    action: "hide",
                    callback: () => game.settings.set("levels", "migrateOnStartupDialog", false),
                },
            ],
        }).render({ force: true });
    }

    levelMergeContextOptions(app, options) {
        options.push({
            label: "Merge Into Level",
            icon: "fa-solid fa-code-merge",
            visible: (li) => li.dataset.levelId && game.user.isGM,
            onClick: (event, li) => {
                const scene = game.scenes.get(li.dataset.sceneId) ?? game.scenes.active;
                const level = scene?.levels.get(li.dataset.levelId);
                LevelsMigration.mergeLevelDialog(scene, level);
            }
        });
    }

    // Show Dialog with options to select another level to merge into
    static async mergeLevelDialog(scene, level) {
        const levels = scene.levels.contents.filter(x => x !== level);
        const data = await foundry.applications.api.DialogV2.input({
            window: { title: `Levels - Merge Level ${level.name} (${level.elevation.bottom}|${level.elevation.top})` },
            content: `
                <p>You're about to merge all content from <strong>${level.name}</strong> into the selected level and delete it.<br><strong>This operation cannot be undone.</strong><br>Please backup your scene before proceeding.</p>
                <select name="level">
                    <option value="">Select a level to merge into</option>
                    ${levels.map(x => `<option value="${x.id}">${x.name} (${x.elevation.bottom}|${x.elevation.top})</option>`).join("\n")}
                </select>
            `,
        });
        if (!data?.level) return;
        LevelsMigration.mergeLevel(scene, level, scene.levels.get(data.level));
    }

    static async mergeLevel(scene, level, targetLevel) {
        const updates = {};
        for (const [collectionName, collection] of Object.entries(scene.collections)) {
            const documents = collection.contents;
            for (const document of documents) {
                if (document.level === level.id) {
                    updates[document.documentName] ??= [];
                    updates[document.documentName].push({
                        _id: document.id,
                        level: targetLevel.id,
                    });
                    continue;
                }
                if (!document.levels) continue;
                if (!document.levels.has(level.id)) continue;
                updates[document.documentName] ??= [];
                updates[document.documentName].push({
                    _id: document.id,
                    levels: [...Array.from(document.levels), targetLevel.id],
                });
            }
        }
        const movedThings = [];
        for (const [documentName, documentUpdates] of Object.entries(updates)) {
            movedThings.push(`${documentUpdates.length} ${documentName}`);
            await scene.updateEmbeddedDocuments(documentName, documentUpdates);
        }
        await scene.deleteEmbeddedDocuments("Level", [level.id]);
        ui.notifications.notify(`Levels - Merged level ${level.name} into ${targetLevel.name}. Moved ${movedThings.join(", ")}.`);
    }
}
