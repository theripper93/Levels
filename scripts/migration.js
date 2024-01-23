/*
This is internal code not currently used for the future V11 -> V12 migration
For every document in the collection, we want to migrate "flags.levels.rangeBottom" to the new core "elevation" property.
*/

export class LevelsMigration {
    constructor() {}

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
        ui.notifications.notify(`Wall Height - Migration Complete.`);
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
                            "-=levels.rangeBottom": null,
                        },
                    };
                    updates.push(update);
                }
            }
            if (updates.length <= 0) continue;
            await collection.updateEmbeddedDocuments(documents[0].documentName, updates);
            ui.notifications.notify("Levels - Migrated " + updates.length + " " + collectionName + "s to new elevation data structure in scene " + scene.name);
            console.log("Levels - Migrated " + updates.length + " " + collectionName + "s to new elevation data structure in scene " + scene.name);
        }
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
                all: {
                    label: "Migrate All Sidebar Scenes",
                    callback: () => this.migrateScenes(),
                },
                compendiums: {
                    label: "Migrate All Scenes in Compendiums",
                    callback: () => this.migrateCompendiums(),
                },
            },
            default: "scene",
        }).render(true);
    }
}
