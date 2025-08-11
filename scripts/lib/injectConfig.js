//injectConfig library by @theripper93
//License: MIT
//Documentation: https://github.com/theripper93/injectConfig

let moduleId = "";
let object = null;
let hookSet = false;

export const injectConfig = {
    _processData: function _processData(data) {
        if (data.tab?.subTabs) {
            for (const [k, v] of Object.entries(data)) {
                if (k === "moduleId" || k === "inject" || k === "tab") continue;
                for (const [k2, v2] of Object.entries(v)) {
                    if (k2 === "tabIcon" || k2 === "tabLabel" || k2 === "tabNotes") continue;
                    this._processInputData(k2, v2);
                }
            }
        } else {
            for (const [k, v] of Object.entries(data)) {
                if (k === "moduleId" || k === "inject" || k === "tab") continue;
                this._processInputData(k, v);
            }
        }
    },

    _processInputData: function _processInputData(k, v) {
        //if (k === "moduleId" || k === "inject" || k === "tab") continue;
        const elemData = v;
        v.name = "flags." + moduleId + "." + (k || "");
        v.value = object?.getFlag(moduleId, k) ?? elemData.default ?? getDefaultFlag(k);
        v.label = v.units ? v.label + `<span class="units"> (${v.units})</span>` : v.label;
        if (v.type.includes("filepicker")) {
            const split = v.type.split(".");
            v.fpType = split[1] ?? "imagevideo";
            if (v.fpTypes) {
                v.fpTypes = v.fpTypes.join(",");
                setFilePickerHook();
            }
            v.type = "filepicker";
        }

        function getDefaultFlag(inputType) {
            switch (inputType) {
                case "number":
                    return 0;
                case "checkbox":
                    return false;
            }
            return "";
        }
    },

    _getInjectionPoint: function _getInjectionPoint(app, html, data, object) {
        let injectPoint;
        if (typeof data.inject === "string") {
            injectPoint = html.querySelector(data.inject).closest(".form-group");
        } else {
            injectPoint = data.inject;
        }
        injectPoint = injectPoint ?? (data.tab ? [...html.querySelectorAll(".window-content > .tab")].at(-1) ?? [...html.querySelectorAll(".tab")].at(-1) : [...html.querySelectorAll(".form-group").at(-1)]);
        return injectPoint;
    },

    _createTab: function _createTab(html, name, label, icon) {
        const tabs = [...html.querySelector(".sheet-tabs").querySelectorAll(".item")].at(-1);
        if (!tabs) return this._createTabV2(html, name, label, icon);
        const tab = document.createElement("a");
        tab.classList.add("item");
        tab.dataset.tab = name;
        tab.innerHTML = `<i class="${icon}"></i> ${label}`;
        tabs.after(tab);
        const tabContainer = document.createElement("div");
        tabContainer.classList.add("tab");
        tabContainer.dataset.tab = name;
        return tabContainer;
    },

    _createTabV2: function _createTabV2(html, name, label, icon) {
        const tabs = [...html.querySelector(".sheet-tabs").querySelectorAll(`[data-action="tab"]`)].at(-1);
        const tab = document.createElement("a");
        tab.dataset.tab = name;
        tab.dataset.action = "tab";
        tab.dataset.group = tabs.dataset.group;
        tab.innerHTML = `<i class="${icon}"></i> <label>${label}</label>`;
        tabs.after(tab);
        const tabContainer = document.createElement("section");
        tabContainer.classList.add("tab", "standard-form", "scrollable");
        tabContainer.dataset.tab = name;
        tabContainer.dataset.group = tabs.dataset.group;
        return tabContainer;
    },

    _generateInnerHtml: function _generateInnerHtml(app, data, tabSize) {
        if (data.tab?.subTabs) {
            const container = document.createElement("div");
            const subTabNav = document.createElement("nav");
            subTabNav.classList.add("tabs", "sheet-tabs", "secondary-tabs");
            subTabNav.dataset.group = data.tab.name;
            container.append(subTabNav);
            for (const [k, v] of Object.entries(data)) {
                if (k === "tab" || k === "moduleId" || k === "inject") continue;
                const a = document.createElement("a");
                a.classList.add("item");
                a.dataset.tab = k;
                a.dataset.group = data.tab.name;
                a.innerHTML = `<i class="${v.tabIcon}"></i> ${v.tabLabel}`;
                a.addEventListener("click", (e) => {
                    const tab = e.currentTarget.dataset.tab;
                    container.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
                    e.currentTarget.classList.add("active");
                    container.querySelectorAll(".tab").forEach((i) => i.classList.remove("active"));
                    container.querySelector(`.tab[data-tab="${tab}"]`).classList.add("active");
                    //app.setPosition({ height: "auto", width: data.tab ? app.options.width + tabSize : "auto" });
                });
                subTabNav.append(a);
                const tabContents = document.createElement("div");
                tabContents.classList.add("tab");
                tabContents.dataset.tab = k;
                tabContents.dataset.group = data.tab.name;
                container.append(tabContents);
                const renderedContent = getRenderedTemplate({ inputs: v });
                if (v.tabNotes) {
                    const notes = document.createElement("p");
                    notes.classList.add("notes");
                    notes.innerHTML = v.tabNotes;
                    tabContents.append(notes);
                }
                Array.from(renderedContent.children).forEach((e) => tabContents.append(e));
            }
            //set first tab to active
            subTabNav.querySelector(".item").classList.add("active");
            container.querySelector(".tab").classList.add("active");
            return container;
        } else {
            return getRenderedTemplate({ inputs: data });
        }
    },

    inject: function injectConfig(app, html, data, _object) {
        moduleId = data.moduleId;
        object = _object || app.document;
        html = $(html);
        html = html.closest(".app, .application") ?? html;
        html = html[0];

        try {
            this._processData(data);
        } catch (error) {
            console.warn("Error processing data", error);
        }

        const injectPoint = this._getInjectionPoint(app, html, data, object);

        const isTabs = !!html.querySelector(".sheet-tabs");
        this._generateTabStruct(app, html, data, object);

        const tabSize = data.tab?.width ?? 100;

        let injectHtml = this._generateInnerHtml(app, data, tabSize);

        try {
            app.activateListeners($(injectHtml));
        } catch (error) {}

        if (data.tab) {
            const injectTab = this._createTab(html, data.tab.name, data.tab.label, data.tab.icon);
            injectTab.append(injectHtml);
            (injectPoint ?? this._getInjectionPoint(app, html, data, object)).after(injectTab);
            if (app._activeTab) html.querySelector(`.item[data-tab="${app._activeTab}"]`)?.click();
        } else {
            injectPoint.after(injectHtml);
        }
        html.querySelectorAll(".tabs .item").forEach((item) => {
            item.addEventListener("click", (e) => (app._activeTab = e.currentTarget.dataset.tab));
        });

        if (!isTabs) {
            html.querySelectorAll(".item").forEach((item) => {
                item.addEventListener("click", (e) => {
                    html.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
                    e.currentTarget.classList.add("active");
                    html.querySelectorAll(".tab").forEach((i) => i.classList.remove("active"));
                    html.querySelector(`.tab[data-tab="${e.currentTarget.dataset.tab}"]`).classList.add("active");
                    //app.setPosition({ height: "auto", width: data.tab ? app.options.width + tabSize : "auto" });
                });
            });
        }

        if (app) app?.setPosition({ height: "auto" });
        return $(injectHtml);
    },
    quickInject: function quickInject(injectData, data) {
        injectData = Array.isArray(injectData) ? injectData : [injectData];
        for (const doc of injectData) {
            let newData = data;
            if (doc.inject) {
                newData = JSON.parse(JSON.stringify(data));
                data.inject = doc.inject;
            }
            Hooks.on(`render${doc.documentName}Config`, (app, html) => {
                injectConfig.inject(app, html, newData);
            });
        }
    },
    _generateTabStruct: function _generateTabStruct(app, html, data, object) {
        const isTabs = !!html.querySelector(".sheet-tabs");
        const useTabs = data.tab;
        if (isTabs || !useTabs) return;
        const tabSize = data.tab?.width || 100;
        const layer = app?.object?.layer?.options?.name;
        const icon = $(".main-controls").find(`li[data-canvas-layer="${layer}"]`).find("i").attr("class");

        const tabsInner = `<nav class="sheet-tabs tabs">
        <a class="item active" data-tab="basic"><i class="${icon}"></i> ${game.i18n.localize("AMBIENT_LIGHT.SECTIONS.BASIC")}</a>
        </nav>
        <div class="tab active" data-tab="basic"></div>`;
        const container = document.createElement("div");
        container.innerHTML = tabsInner;
        const inputsContainer = container.querySelector(".tab");
        //move all content of form into tab
        const form = html.querySelector("form");
        Array.from(form.children).forEach((e) => {
            inputsContainer.append(e);
        });

        Array.from(container.children).forEach((e) => {
            form.append(e);
        });

        const submitButton = html.querySelector("button[type='submit']");
        form.append(submitButton);
    },
};

const _template = `

<div class="standard-form">
    {{#each inputs as |input|}}
    {{#if (eq input.type 'custom')}}
    {{{input.html}}}
    {{else}}
    <div class="form-group">
        
            <label for="{{input.name}}">{{{input.label}}}</label>
            <div class="form-fields">
        
        {{#if (eq input.type 'text')}}
            <input type="text" name="{{input.name}}" placeholder="{{input.placeholder}}" value="{{input.value}}">
        {{/if}}

        {{#if (eq input.type 'textarea')}}
            <textarea type="text" name="{{input.name}}" placeholder="{{input.placeholder}}"">{{input.value}}</textarea>
        {{/if}}

        {{#if (eq input.type 'number')}}
            <input type="number" min="{{input.min}}" max="{{input.max}}" step="{{input.step}}" name="{{input.name}}" placeholder="{{input.placeholder}}" value="{{input.value}}">
        {{/if}}

        {{#if (eq input.type 'checkbox')}}
            <input type="checkbox" name="{{input.name}}" {{#if input.value}}checked{{/if}}>
        {{/if}}

        {{#if (eq input.type 'select')}}
            <select name="{{input.name}}">
            {{#each input.options as |option|}}
                {{#if option.optgroup}}
                    {{#if option.optgroup.start}}
                        <optgroup label="{{option.optgroup.label}}">
                    {{else}}
                        </optgroup>
                    {{/if}}
                {{else}}
                <option value="{{@key}}" {{#if (eq @key input.value)}}selected{{/if}}>{{option}}</option>
                {{/if}}
            {{/each}}
            </select>
        {{/if}}

        {{#if (eq input.type 'range')}}
                <input type="range" min="{{input.min}}" max="{{input.max}}" step="{{input.step}}" name="{{input.name}}" value="{{input.value}}">
                <span class="range-value">{{input.value}}</span>
        {{/if}}

        {{#if (eq input.type 'color')}}
            <color-picker name="{{input.name}}" value="{{input.value}}" default="#000000"></color-picker>
        {{/if}}

        {{#if (eq input.type 'filepicker')}}
                    <file-picker data-extras="{{input.fpTypes}}" name="{{input.name}}" value="{{input.value}}" type="{{input.fpType}}"></file-picker>
                    {{/if}}
                    
                    </div>
        {{#if input.notes}}
        <p class="notes hint">{{input.notes}}</p>
        {{/if}}
    </div>
    {{/if}}
    {{/each}}
</div>

`;

let _compiledTemplate = null;

function getRenderedTemplate(data) {
    data.inputs = { ...data.inputs };
    delete data.inputs.tab;
    delete data.inputs.moduleId;
    delete data.inputs.inject;
    const compiledTemplate = _compiledTemplate ?? Handlebars.compile(_template);
    _compiledTemplate = compiledTemplate;
    const innerHtml = compiledTemplate(data, {
        allowProtoMethodsByDefault: true,
        allowProtoPropertiesByDefault: true,
    });
    const el = document.createElement("div");
    el.innerHTML = innerHtml;
    return el.children[0];
}

function setFilePickerHook() {
    if (hookSet) return;
    hookSet = true;
    Hooks.on("renderFilePicker", (app, html, data) => {
        const button = app.button;
        if (!button || app._customExtensionsAdded) return;
        const ext = button[0].dataset.extras;
        if (!ext) return;
        const extraExt = ext.split(",");
        app.extensions ? app.extensions.push(...extraExt) : (app.extensions = extraExt);
        app._customExtensionsAdded = true;
        app.render(true);
    });
}
