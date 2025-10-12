// ==UserScript==
// @name         Global Translation Toggle
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a button to globally toggle all translation boxes on the page
// @match        https://toefl.kmf.com/listening/newdrilling/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Wait until page content is ready
    function onReady(callback) {
        if (document.readyState !== "loading") callback();
        else document.addEventListener("DOMContentLoaded", callback);
    }

    onReady(function () {
        // ✅ 1. Insert the Global Toggle Button
        const btn = document.createElement("button");
        btn.id = "toggle-all-translations";
        btn.textContent = "Show All Translations";
        btn.style.position = "fixed";
        btn.style.top = "10px";
        btn.style.right = "10px";
        btn.style.zIndex = "9999";
        btn.style.padding = "6px 12px";
        btn.style.cursor = "pointer";
        document.body.appendChild(btn);

        let translationsVisible = false;

        // ✅ 2. Toggle Translations on Click
        btn.addEventListener("click", function () {
            translationsVisible = !translationsVisible;

            const boxes = document.querySelectorAll(".translation-box");
            const toggles = document.querySelectorAll(".show-transition");

            boxes.forEach((box) => {
                box.style.display = translationsVisible ? "block" : "none";
            });

            // Optional: sync icons/buttons if exist
            toggles.forEach((t) => {
                if (translationsVisible) {
                    t.classList.add("active");
                } else {
                    t.classList.remove("active");
                }
            });

            btn.textContent = translationsVisible
                ? "Hide All Translations"
                : "Show All Translations";
        });
    });
})();
