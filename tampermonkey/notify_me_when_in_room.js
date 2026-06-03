// ==UserScript==
// @name         Cloudflare Waiting Room Bark Notify
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Notify via Bark when leaving Cloudflare waiting room
// @match        https://www.usvisascheduling.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      api.day.app
// ==/UserScript==

(function () {
    "use strict";

    const STORAGE_KEY = "bark_key";

    function getBarkKey() {
        return GM_getValue(STORAGE_KEY, "");
    }

    function setBarkKey(key) {
        GM_setValue(STORAGE_KEY, key);
    }

    function promptForKey() {
        const key = prompt("Enter your Bark key:");
        if (key && key.trim()) {
            setBarkKey(key.trim());
        }
        return getBarkKey();
    }

    function getBarkUrl() {
        let key = getBarkKey();
        if (!key) {
            key = promptForKey();
        }
        return key ? `https://api.day.app/${key}` : null;
    }

    GM_registerMenuCommand("Set Bark Key", promptForKey);

    let wasInWaitingRoom = false;
    let notified = false;

    let BARK_URL;

    function sendBark(title, body) {
        if (notified) return;
        notified = true;

        GM_xmlhttpRequest({
            method: "GET",
            url: `${BARK_URL}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`,
            onload: function () {
                console.log("Bark notification sent");
            },
            onerror: function (err) {
                console.error("Bark failed", err);
            },
        });
    }

    function checkStatus() {
        const text = document.body.innerText || "";

        const inWaitingRoom =
            text.includes("You are now in line") ||
            text.includes("estimated wait time") ||
            location.pathname.includes("waitingroom");

        if (inWaitingRoom) {
            wasInWaitingRoom = true;
        } else if (wasInWaitingRoom) {
            sendBark("Waiting Room Ended", `Entered site: ${location.href}`);
        }
    }

    // Initial check
    function init() {
        BARK_URL = getBarkUrl();
        if (!BARK_URL) {
            console.log(
                "Bark key not set. Use Tampermonkey menu → Set Bark Key.",
            );
            return;
        }
        checkStatus();

        // Re-check on DOM changes
        const observer = new MutationObserver(() => {
            checkStatus();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        // Fallback interval check
        setInterval(checkStatus, 3000);
    }

    init();
})();
