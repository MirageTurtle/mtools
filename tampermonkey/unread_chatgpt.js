// ==UserScript==
// @name         unread_chatgpt
// @namespace    https://mirageturtle.top
// @version      0.1
// @description  Add “Mark as unread” to ChatGPT conversation menus. Marks are stored locally in this browser.
// @author       MirageTurtle
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const STORAGE_PREFIX = "unread_chatgpt:";
    const LINK = "a[data-sidebar-item][href]";
    const TRIGGER = "button[data-conversation-options-trigger]";
    const MARKER = "unread-chatgpt-marker";
    const ACTION = "unread-chatgpt-action";
    const unread = new Set();
    const labels = new WeakMap();
    const menus = new WeakSet();
    let previousChat;
    let scheduled = false;
    let storageWarning = false;

    function warnStorage(error) {
        if (storageWarning) return;
        storageWarning = true;
        console.warn(
            "[unread_chatgpt] Storage is unavailable; marks will only last for this page.",
            error,
        );
    }

    function loadUnread() {
        try {
            unread.clear();
            for (const key of Object.keys(localStorage)) {
                if (
                    key.startsWith(STORAGE_PREFIX) &&
                    localStorage.getItem(key) === "1"
                ) {
                    unread.add(key.slice(STORAGE_PREFIX.length));
                }
            }
        } catch (error) {
            warnStorage(error);
        }
    }

    function setUnread(id, value) {
        if (!id || unread.has(id) === value) return;
        if (value) unread.add(id);
        else unread.delete(id);
        try {
            // One key per conversation avoids overwriting another tab's marks.
            if (value) localStorage.setItem(STORAGE_PREFIX + id, "1");
            else localStorage.removeItem(STORAGE_PREFIX + id);
        } catch (error) {
            warnStorage(error);
        }
        schedule();
    }

    function idFromPath(path) {
        return path.match(/\/c\/([^/?#]+)/)?.[1] || null;
    }

    function idFromLink(link) {
        return (
            link.querySelector(TRIGGER)?.dataset.conversationOptionsTrigger ||
            idFromPath(new URL(link.href, location.href).pathname)
        );
    }

    function updateMarker(link) {
        const marked = unread.has(idFromLink(link));
        const marker = link.querySelector(`.${MARKER}`);
        // trailing-pair contains the buttons too; only its default dot is an unread indicator.
        const nativeDot = link.querySelector(
            '.trailing-pair [data-trailing-style="default"] .rounded-full',
        );
        const label = link.getAttribute("aria-label");
        const ownedLabel = labels.get(link);

        if (marked) {
            if (!link.hasAttribute("data-unread-chatgpt"))
                link.setAttribute("data-unread-chatgpt", "");
            if (label && !label.endsWith(", unread")) {
                labels.set(link, {
                    original: label,
                    unread: `${label}, unread`,
                });
                link.setAttribute("aria-label", `${label}, unread`);
            }
            if (!nativeDot && !marker) {
                const dot = document.createElement("span");
                dot.className = `${MARKER} rounded-full bg-theme-submit-btn-bg h-2 w-2`;
                dot.setAttribute("aria-hidden", "true");
                link.appendChild(dot);
            } else if (nativeDot) {
                marker?.remove();
            }
        } else {
            if (link.hasAttribute("data-unread-chatgpt"))
                link.removeAttribute("data-unread-chatgpt");
            marker?.remove();
            // Restore only labels we changed; leave ChatGPT's own unread state alone.
            if (ownedLabel && label === ownedLabel.unread) {
                link.setAttribute("aria-label", ownedLabel.original);
            }
            labels.delete(link);
        }
    }

    function handleMenuKeys(event) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
        const menu = event.currentTarget;
        if (event.target.closest('[role="menu"]') !== menu) return;
        const items = [...menu.querySelectorAll('[role^="menuitem"]')].filter(
            (item) =>
                item.closest('[role="menu"]') === menu &&
                item.getAttribute("aria-disabled") !== "true" &&
                !item.hasAttribute("data-disabled") &&
                item.getClientRects().length,
        );
        if (!items.length) return;
        const index = items.indexOf(document.activeElement);
        let next;
        if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else if (index < 0)
            next = event.key === "ArrowDown" ? 0 : items.length - 1;
        else
            next =
                (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
                items.length;
        // The injected item is not part of Radix's React-managed focus collection.
        event.preventDefault();
        event.stopPropagation();
        items[next].focus();
    }

    function updateMenus() {
        const openTriggers = [...document.querySelectorAll(TRIGGER)].filter(
            (trigger) =>
                trigger.getAttribute("aria-expanded") === "true" ||
                trigger.dataset.state === "open",
        );
        for (const menu of document.querySelectorAll('[role="menu"]')) {
            if (
                menu.dataset.state === "closed" ||
                !menu.getClientRects().length
            )
                continue;
            const labelledBy = (
                menu.getAttribute("aria-labelledby") || ""
            ).split(/\s+/);
            const trigger = openTriggers.find(
                (button) =>
                    (button.id && labelledBy.includes(button.id)) ||
                    (menu.id &&
                        button.getAttribute("aria-controls") === menu.id),
            );
            // Associate the portalled menu with its trigger, never with the current URL.
            if (!trigger) continue;
            const id = trigger.dataset.conversationOptionsTrigger;
            let item = menu.querySelector(`.${ACTION}`);
            if (item) {
                item.dataset.conversationId = id;
                continue;
            }
            item = document.createElement("div");
            item.className = ACTION;
            item.setAttribute("role", "menuitem");
            item.tabIndex = -1;
            item.dataset.conversationId = id;
            item.innerHTML =
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg><span>Mark as unread</span>';
            const activate = (event) => {
                event.preventDefault();
                event.stopPropagation();
                setUnread(item.dataset.conversationId, true);
                // Let the native menu dismiss itself and restore its focus/scroll state.
                item.dispatchEvent(
                    new KeyboardEvent("keydown", {
                        key: "Escape",
                        code: "Escape",
                        bubbles: true,
                        cancelable: true,
                    }),
                );
            };
            item.addEventListener("click", activate);
            item.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") activate(event);
            });
            item.addEventListener("pointermove", () =>
                item.focus({ preventScroll: true }),
            );
            if (!menus.has(menu)) {
                menu.addEventListener("keydown", handleMenuKeys, true);
                menus.add(menu);
            }
            menu.appendChild(item);
        }
    }

    function sync() {
        scheduled = false;
        const currentChat = idFromPath(location.pathname);
        if (currentChat !== previousChat) {
            previousChat = currentChat;
            setUnread(currentChat, false);
        }
        document.querySelectorAll(LINK).forEach(updateMarker);
        updateMenus();
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(sync);
    }

    function initialize() {
        const style = document.createElement("style");
        style.textContent = `
            [data-unread-chatgpt] { position: relative; }
            .${MARKER} {
                position: absolute; inset-inline-end: 12px; top: 50%;
                transform: translateY(-50%); width: 8px; height: 8px;
                border-radius: 50%; pointer-events: none;
                background: var(--theme-submit-btn-bg, var(--text-primary, #202123));
            }
            [data-chat-theme="black"] .${MARKER} {
                background: var(--theme-entity-accent, var(--text-primary, #202123));
            }
            [data-unread-chatgpt]:is(:hover, :focus-within) .${MARKER},
            [data-unread-chatgpt]:has([aria-expanded="true"]) .${MARKER} { opacity: 0; }
            [data-unread-chatgpt]:has(.${MARKER}):not(:hover):not(:focus-within):not(:has([aria-expanded="true"])) [data-trailing-button] {
                visibility: hidden;
            }
            .${ACTION} {
                display: flex; align-items: center; gap: 10px; padding: 8px;
                min-height: 36px; box-sizing: border-box; border-radius: 6px;
                font: inherit; color: var(--text-primary, inherit);
                cursor: pointer; user-select: none; outline: none;
            }
            .${ACTION}:is(:hover, :focus) {
                background: var(--interactive-bg-secondary-hover, var(--bg-tertiary, rgba(128,128,128,.16)));
            }
            .${ACTION} svg { flex-shrink: 0; }
        `;
        document.head.appendChild(style);
        loadUnread();

        document.addEventListener(
            "click",
            (event) => {
                if (
                    event.button !== 0 ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    event.altKey
                )
                    return;
                if (!(event.target instanceof Element)) return;
                // Options, pin buttons, and other userscripts' controls do not open the chat.
                if (
                    event.target.closest(
                        'button, input, [role="button"], [role^="menuitem"]',
                    )
                )
                    return;
                const link = event.target.closest(LINK);
                if (link && link.target !== "_blank")
                    setUnread(idFromLink(link), false);
            },
            true,
        );

        window.addEventListener("storage", (event) => {
            if (event.key === null) loadUnread();
            else if (event.key.startsWith(STORAGE_PREFIX)) {
                const id = event.key.slice(STORAGE_PREFIX.length);
                if (event.newValue === "1") unread.add(id);
                else unread.delete(id);
            } else return;
            schedule();
        });
        window.addEventListener("popstate", schedule);
        window.navigation?.addEventListener("navigatesuccess", schedule);
        new MutationObserver(schedule).observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "aria-expanded",
                "aria-labelledby",
                "aria-controls",
                "aria-label",
                "data-state",
                "href",
                "data-conversation-options-trigger",
            ],
        });
        sync();
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true,
        });
    else initialize();
})();
