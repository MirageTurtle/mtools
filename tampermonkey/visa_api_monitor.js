// ==UserScript==
// @name         Visa API Monitor
// @namespace    https://mirageturtle.top/
// @version      1.1
// @description  Monitor visa schedule API responses for early slot availability
// @author       MirageTurtle
// @match        https://www.usvisascheduling.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_URL =
        "custom-actions/?route=/api/v1/schedule-group/get-family-consular-schedule-days";
    const CUTOFF_DATE = "2026-07-10";

    function showToast(message) {
        const toast = document.createElement("div");
        toast.textContent = message;
        Object.assign(toast.style, {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#333",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            zIndex: "99999",
            maxWidth: "360px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "visa-toast-in 0.3s ease",
        });
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.3s";
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this._url = url;
        return originalXhrOpen.apply(this, [method, url, ...args]);
    };

    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (_body) {
        this.addEventListener("load", function () {
            if (this._url && this._url.includes(TARGET_URL)) {
                console.log("Intercepted XHR request:", this._url);
                // console.log('Response data:', this.responseText);

                try {
                    const trimmed = this.responseText.trim();
                    if (trimmed.length === 0) return;

                    const data = JSON.parse(trimmed);
                    const scheduleDays = data.ScheduleDays || [];

                    const earlyDays = scheduleDays
                        .filter((d) => d.Date <= CUTOFF_DATE)
                        .sort((a, b) => a.Date.localeCompare(b.Date));

                    if (earlyDays.length > 0) {
                        const dates = earlyDays.map((d) => d.Date).join(", ");
                        console.log(
                            `${earlyDays.length} slot(s) before Jul 10: ${dates}`,
                        );
                        showToast(
                            `${earlyDays.length} slot(s) before Jul 10: ${dates}`,
                        );
                    }
                } catch (e) {
                    console.error("Visa Monitor: failed to parse response", e);
                }
            }
        });
        return originalXhrSend.apply(this, arguments);
    };
})();
