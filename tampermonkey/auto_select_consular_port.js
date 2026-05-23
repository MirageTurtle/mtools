// ==UserScript==
// @name         Auto Select Consular Post
// @namespace    https://mirageturtle.top/
// @version      1.2
// @description  Auto select the only available consular post option
// @author       MirageTurtle
// @match        https://www.usvisascheduling.com/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    function showToast(message) {
        const toast = document.createElement("div");

        toast.textContent = message;

        Object.assign(toast.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "8px",
            zIndex: "999999",
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            transition: "opacity 0.3s ease",
            opacity: "1",
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";

            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2500);
    }

    function triggerChange(select) {
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    async function handleSelect() {
        const select = document.querySelector("#post_select");

        if (!select) {
            showToast("#post_select not found");
            return;
        }

        // Clear selection first
        select.value = "";
        triggerChange(select);

        // Wait for AJAX update
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get valid options
        const validOptions = [...select.options].filter(
            (option) => option.value && option.value.trim() !== "",
        );

        if (validOptions.length === 0) {
            showToast("No available Consular Post");
            return;
        }

        if (validOptions.length > 1) {
            showToast(`Found ${validOptions.length} valid options`);
            return;
        }

        // Auto select
        select.value = validOptions[0].value;
        triggerChange(select);

        showToast(`Selected: ${validOptions[0].text}`);
    }

    function createButton() {
        // Find button container
        const container = document.querySelector(".col-sm-12.mt-3");

        if (!container) {
            console.error("Button container not found");
            return;
        }

        // Prevent duplicate button
        if (document.querySelector("#auto_select_btn")) {
            return;
        }

        const btn = document.createElement("button");

        btn.id = "auto_select_btn";
        btn.type = "button";
        btn.textContent = "Auto Select";

        // Reuse site's native button style
        btn.className = "btn-atlas btn-atlas-submit pull-right";

        // Spacing from Submit button
        btn.style.marginRight = "10px";

        btn.addEventListener("click", handleSelect);

        // Insert after Submit button
        const submitBtn = document.querySelector("#submitbtn");

        if (submitBtn) {
            submitBtn.insertAdjacentElement("afterend", btn);
        } else {
            container.appendChild(btn);
        }
    }

    const observer = new MutationObserver(() => {
        const container = document.querySelector(".col-sm-12.mt-3");
        if (container) {
            createButton();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
