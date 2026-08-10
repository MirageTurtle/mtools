// ==UserScript==
// @name         Checkee Visa Table Filter
// @namespace    https://mirageturtle.top/
// @version      1.0
// @description  Add live, combinable filters to the Checkee visa status table
// @author       MirageTurtle
// @match        *://checkee.info/main.php*
// @match        *://*.checkee.info/main.php*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const PANEL_ID = "checkee-filter-panel";
    const STYLE_ID = "checkee-filter-style";
    const REQUIRED_HEADERS = [
        "Visa Type",
        "Visa Entry",
        "US Consulate",
        "Status",
        "Check Date",
        "Waiting Day(s)",
    ];

    function normalize(value) {
        return value.replace(/\s+/g, " ").trim();
    }

    function findVisaTable() {
        return [...document.querySelectorAll("table")].find((table) => {
            const firstRow = table.rows[0];
            if (!firstRow) return false;

            const headers = [...firstRow.cells].map((cell) =>
                normalize(cell.textContent),
            );
            return REQUIRED_HEADERS.every((header) => headers.includes(header));
        });
    }

    function getColumnIndexes(headerRow) {
        return Object.fromEntries(
            [...headerRow.cells].map((cell, index) => [
                normalize(cell.textContent),
                index,
            ]),
        );
    }

    function getCellText(row, index) {
        return index === undefined ? "" : normalize(row.cells[index]?.textContent || "");
    }

    function getUniqueValues(rows, index) {
        return [...new Set(rows.map((row) => getCellText(row, index)).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${PANEL_ID} {
                box-sizing: border-box;
                width: 98%;
                margin: 12px auto;
                padding: 14px;
                border: 1px solid #b9c4cf;
                border-radius: 8px;
                background: #f7f9fb;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                color: #1f2933;
                font: 14px/1.4 Arial, sans-serif;
                text-align: left;
            }

            #${PANEL_ID} .checkee-filter-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                align-items: end;
            }

            #${PANEL_ID} .checkee-filter-field {
                display: flex;
                min-width: 0;
                flex-direction: column;
                gap: 4px;
            }

            #${PANEL_ID} label {
                font-weight: 600;
                color: #34495e;
            }

            #${PANEL_ID} input,
            #${PANEL_ID} select,
            #${PANEL_ID} button {
                box-sizing: border-box;
                min-height: 34px;
                border: 1px solid #9aa9b8;
                border-radius: 5px;
                background: #fff;
                color: #1f2933;
                font: inherit;
            }

            #${PANEL_ID} input,
            #${PANEL_ID} select {
                width: 100%;
                padding: 6px 8px;
            }

            #${PANEL_ID} input:focus,
            #${PANEL_ID} select:focus {
                border-color: #2474b5;
                outline: 2px solid rgba(36, 116, 181, 0.18);
            }

            #${PANEL_ID} .checkee-filter-actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-top: 12px;
            }

            #${PANEL_ID} .checkee-filter-count {
                font-weight: 600;
            }

            #${PANEL_ID} button {
                padding: 6px 16px;
                cursor: pointer;
                background: #e9eef3;
            }

            #${PANEL_ID} button:hover {
                background: #dce5ed;
            }

            @media (max-width: 600px) {
                #${PANEL_ID} .checkee-filter-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                #${PANEL_ID} .checkee-filter-wide {
                    grid-column: 1 / -1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createField(labelText, control, wide = false) {
        const wrapper = document.createElement("div");
        wrapper.className = `checkee-filter-field${wide ? " checkee-filter-wide" : ""}`;

        const label = document.createElement("label");
        label.textContent = labelText;
        label.htmlFor = control.id;

        wrapper.append(label, control);
        return wrapper;
    }

    function createInput(id, type = "text", placeholder = "") {
        const input = document.createElement("input");
        input.id = id;
        input.type = type;
        input.placeholder = placeholder;
        return input;
    }

    function createSelect(id, values) {
        const select = document.createElement("select");
        select.id = id;

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All";
        select.appendChild(allOption);

        values.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        return select;
    }

    function installFilter(table) {
        if (document.getElementById(PANEL_ID)) return;

        const headerRow = table.rows[0];
        const rows = [...table.rows].slice(1);
        if (!headerRow || rows.length === 0) return;

        const columns = getColumnIndexes(headerRow);
        addStyles();

        const controls = {
            search: createInput(
                "checkee-filter-search",
                "search",
                "ID, major, details...",
            ),
            visaType: createSelect(
                "checkee-filter-visa-type",
                getUniqueValues(rows, columns["Visa Type"]),
            ),
            visaEntry: createSelect(
                "checkee-filter-visa-entry",
                getUniqueValues(rows, columns["Visa Entry"]),
            ),
            consulate: createSelect(
                "checkee-filter-consulate",
                getUniqueValues(rows, columns["US Consulate"]),
            ),
            status: createSelect(
                "checkee-filter-status",
                getUniqueValues(rows, columns.Status),
            ),
            major: createInput("checkee-filter-major", "search", "e.g. CS, Biology"),
            dateFrom: createInput("checkee-filter-date-from", "date"),
            dateTo: createInput("checkee-filter-date-to", "date"),
            waitingMin: createInput("checkee-filter-waiting-min", "number", "Min"),
            waitingMax: createInput("checkee-filter-waiting-max", "number", "Max"),
        };

        controls.waitingMin.min = "0";
        controls.waitingMax.min = "0";

        const panel = document.createElement("section");
        panel.id = PANEL_ID;
        panel.setAttribute("aria-label", "Visa table filters");

        const grid = document.createElement("div");
        grid.className = "checkee-filter-grid";
        grid.append(
            createField("Search", controls.search, true),
            createField("Visa Type", controls.visaType),
            createField("Visa Entry", controls.visaEntry),
            createField("US Consulate", controls.consulate),
            createField("Status", controls.status),
            createField("Major contains", controls.major),
            createField("Check Date from", controls.dateFrom),
            createField("Check Date to", controls.dateTo),
            createField("Waiting days min", controls.waitingMin),
            createField("Waiting days max", controls.waitingMax),
        );

        const actions = document.createElement("div");
        actions.className = "checkee-filter-actions";

        const count = document.createElement("span");
        count.className = "checkee-filter-count";
        count.setAttribute("aria-live", "polite");

        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Reset filters";

        actions.append(count, reset);
        panel.append(grid, actions);
        table.insertAdjacentElement("beforebegin", panel);

        function applyFilters() {
            const filters = {
                search: controls.search.value.trim().toLocaleLowerCase(),
                visaType: controls.visaType.value,
                visaEntry: controls.visaEntry.value,
                consulate: controls.consulate.value,
                status: controls.status.value,
                major: controls.major.value.trim().toLocaleLowerCase(),
                dateFrom: controls.dateFrom.value,
                dateTo: controls.dateTo.value,
                waitingMin:
                    controls.waitingMin.value === ""
                        ? null
                        : Number(controls.waitingMin.value),
                waitingMax:
                    controls.waitingMax.value === ""
                        ? null
                        : Number(controls.waitingMax.value),
            };

            let visibleCount = 0;

            rows.forEach((row) => {
                const checkDate = getCellText(row, columns["Check Date"]);
                const waitingDays = Number(
                    getCellText(row, columns["Waiting Day(s)"]),
                );
                const details = [...row.querySelectorAll("[title]")]
                    .map((element) => element.getAttribute("title") || "")
                    .join(" ");
                const searchableText = `${row.textContent} ${details}`.toLocaleLowerCase();

                const visible =
                    (!filters.search || searchableText.includes(filters.search)) &&
                    (!filters.visaType ||
                        getCellText(row, columns["Visa Type"]) === filters.visaType) &&
                    (!filters.visaEntry ||
                        getCellText(row, columns["Visa Entry"]) === filters.visaEntry) &&
                    (!filters.consulate ||
                        getCellText(row, columns["US Consulate"]) === filters.consulate) &&
                    (!filters.status ||
                        getCellText(row, columns.Status) === filters.status) &&
                    (!filters.major ||
                        getCellText(row, columns.Major)
                            .toLocaleLowerCase()
                            .includes(filters.major)) &&
                    (!filters.dateFrom || checkDate >= filters.dateFrom) &&
                    (!filters.dateTo || checkDate <= filters.dateTo) &&
                    (filters.waitingMin === null || waitingDays >= filters.waitingMin) &&
                    (filters.waitingMax === null || waitingDays <= filters.waitingMax);

                row.hidden = !visible;
                if (visible) visibleCount += 1;
            });

            count.textContent = `Showing ${visibleCount} of ${rows.length} cases`;
        }

        Object.values(controls).forEach((control) => {
            control.addEventListener("input", applyFilters);
            control.addEventListener("change", applyFilters);
        });

        reset.addEventListener("click", () => {
            Object.values(controls).forEach((control) => {
                control.value = "";
            });
            applyFilters();
            controls.search.focus();
        });

        applyFilters();
    }

    function initialize() {
        const table = findVisaTable();
        if (table) installFilter(table);
    }

    initialize();

    const observer = new MutationObserver(() => {
        if (!document.getElementById(PANEL_ID)) initialize();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
