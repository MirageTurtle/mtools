// ==UserScript==
// @name         bulk_delete_chatgpt
// @namespace    https://mirageturtle.top
// @version      1.4
// @description  Add bulk delete to chat gpt
// @author       MirageTurtle
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Variables to store selected status
    const CHAT_ROW = '[data-sidebar-chatgpt-conversation-key^="chatgpt:conversation:"]';
    const selectedChats = new Set();
    let isCheckboxMode = false;
    let isDeleting = false;
    const DELETE_ATTEMPTS = 3;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let bulkDeleteButton = null;
    let lastClickedChatId = null; // Keep the range anchor across sidebar rerenders
    let checkboxOrder = [];
    const sidebarObserver = new MutationObserver(() => {
        if (isCheckboxMode) addCheckboxes();
    });

    // Function to create floating button with bin icon
    function createBulkDeleteButton() {
        const button = document.createElement("button");
        button.id = "bulk-delete-btn";
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        button.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            padding: 12px;
            border: none;
            border-radius: 50%;
            background: #dc2626;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s, background 0.2s;
        `;
        button.addEventListener("mouseenter", () => {
            button.style.transform = "scale(1.1)";
            button.style.background = "#b91c1c";
        });
        button.addEventListener("mouseleave", () => {
            button.style.transform = "scale(1)";
            button.style.background = "#dc2626";
        });
        button.addEventListener("click", handleButtonClick);
        return button;
    }

    function getChatLinks() {
        // Scope to sidebar rows, including the older layouts, not links in messages.
        return document.querySelectorAll(
            `${CHAT_ROW} a[href*="/c/"], #history a[href*="/c/"], a[data-sidebar-item][href*="/c/"]`,
        );
    }

    function getChatId(link) {
        const url = new URL(link.href, document.baseURI);
        if (url.origin !== new URL(document.baseURI).origin) return null;
        return url.pathname.match(/\/c\/([^/]+)\/?$/)?.[1] || null;
    }

    // Add missing checkboxes and rebuild the full order after sidebar updates.
    function addCheckboxes() {
        // Ignore our own DOM insertions so they cannot trigger an observer loop.
        sidebarObserver.disconnect();
        checkboxOrder = [];
        getChatLinks().forEach((link) => {
            const chatId = getChatId(link);
            if (!chatId) return;

            let checkbox = link.querySelector(".bulk-checkbox");
            if (!checkbox) {
                checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "bulk-checkbox";
                // ChatGPT resets checkboxes to appearance: none at 0x0, so override it.
                checkbox.style.cssText = [
                    "appearance: auto", "width: 16px", "height: 16px", "min-width: 16px", "margin: 0", "margin-inline-end: 8px",
                    "flex-shrink: 0", "align-self: center", "cursor: pointer", "pointer-events: auto",
                    "position: relative", "z-index: 1",
                ].map((rule) => `${rule} !important;`).join(" ");

                // The new conversation rows are draggable.
                checkbox.addEventListener("pointerdown", (event) => event.stopPropagation());
                checkbox.addEventListener("mousedown", (event) => event.stopPropagation());
                checkbox.addEventListener("click", (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    const clickedChatId = checkbox.dataset.chatId;
                    const targetState = !selectedChats.has(clickedChatId);

                    // Cancelling navigation also cancels the native checkbox toggle.
                    setTimeout(() => {
                        if (!isCheckboxMode || !checkbox.isConnected || checkbox.dataset.chatId !== clickedChatId) return;
                        addCheckboxes();
                        if (event.shiftKey && lastClickedChatId) {
                            handleRangeSelection(checkbox, lastClickedChatId, targetState);
                        } else {
                            handleSingleSelection(checkbox, targetState);
                        }
                        lastClickedChatId = clickedChatId;
                        checkboxOrder.forEach((box) => {
                            box.checked = selectedChats.has(box.dataset.chatId);
                        });
                    }, 0);
                });
                link.insertAdjacentElement("afterbegin", checkbox);
            }
            checkbox.dataset.chatId = chatId;
            checkbox.checked = selectedChats.has(chatId);
            checkbox.setAttribute("aria-label", `Select ${link.getAttribute("aria-label") || link.textContent.trim()}`);
            checkboxOrder.push(checkbox);
        });
        if (isCheckboxMode) {
            sidebarObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["href", "data-sidebar-chatgpt-conversation-key"],
            });
        }
    }

    // Function to remove checkboxes
    function removeCheckboxes() {
        sidebarObserver.disconnect();
        const checkboxes = document.querySelectorAll(".bulk-checkbox");
        checkboxes.forEach((checkbox) => checkbox.remove());
        selectedChats.clear();
        // Reset range selection state
        lastClickedChatId = null;
        checkboxOrder = [];
    }

    // Function to parse and build delete URL
    function buildDeleteUrl(chatId) {
        return `https://chatgpt.com/backend-api/conversation/${chatId}`;
    }

    // Function to get auth token
    async function getAuthToken() {
        try {
            const response = await fetch(
                "https://chatgpt.com/api/auth/session",
            );
            const data = await response.json();
            return data.accessToken;
        } catch (error) {
            console.error("Failed to get auth token:", error);
            throw error;
        }
    }

    // ChatGPT rejects bursts of deletes with 404/500, so send them one at a time and retry.
    async function deleteChat(chatId, token) {
        let error;
        for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt++) {
            if (attempt > 1) await sleep(1000 * 2 ** (attempt - 2));
            try {
                const response = await fetch(buildDeleteUrl(chatId), {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ is_visible: false }),
                });
                if (response.ok) return null;
                error = `HTTP ${response.status}`;
                // Retrying cannot fix an authentication failure.
                if (response.status === 401 || response.status === 403) break;
            } catch (e) {
                error = e.message;
            }
        }
        return error;
    }

    // Main deleting function; returns the IDs that could not be deleted
    async function deleteSelectedChats() {
        const failed = [];
        let token;
        try {
            token = await getAuthToken();
        } catch (error) {
            console.error("Failed to delete chats:", error);
            return [...selectedChats];
        }

        for (const chatId of selectedChats) {
            const error = await deleteChat(chatId, token);
            if (error) {
                console.warn(`Failed to delete chat ${chatId}: ${error}`);
                failed.push(chatId);
                continue;
            }
            // Remove the complete row, including its action buttons.
            getChatLinks().forEach((link) => {
                if (getChatId(link) === chatId) {
                    (link.closest(CHAT_ROW) || link).remove();
                }
            });
        }

        console.log(`Deletion complete: ${selectedChats.size - failed.length} successful, ${failed.length} failed`);
        return failed;
    }

    function handleRangeSelection(currentCheckbox, lastChatId, targetState) {
        const currentIndex = checkboxOrder.indexOf(currentCheckbox);
        const lastIndex = checkboxOrder.findIndex((checkbox) => checkbox.dataset.chatId === lastChatId);

        if (currentIndex === -1 || lastIndex === -1) {
            // Fallback to single selection if indices not found
            handleSingleSelection(currentCheckbox, targetState);
            return;
        }

        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);

        // Apply state to all checkboxes in range
        for (let i = startIndex; i <= endIndex; i++) {
            const checkbox = checkboxOrder[i];
            const chatId = checkbox.dataset.chatId;

            checkbox.checked = targetState;

            if (targetState) {
                selectedChats.add(chatId);
            } else {
                selectedChats.delete(chatId);
            }
        }
    }

    function handleSingleSelection(checkbox, targetState) {
        const chatId = checkbox.dataset.chatId;
        checkbox.checked = targetState;

        if (checkbox.checked) {
            selectedChats.add(chatId);
        } else {
            selectedChats.delete(chatId);
        }
    }

    // Button click handler
    async function handleButtonClick() {
        if (isDeleting) return;
        if (!isCheckboxMode) {
            // First click: add checkboxes
            isCheckboxMode = true;
            addCheckboxes();
            return;
        }
        // Second click: delete selected or just remove checkboxes
        if (selectedChats.size > 0) {
            setDeleting(true);
            const failed = await deleteSelectedChats().finally(() => setDeleting(false));
            if (failed.length > 0) {
                // Keep only the failures selected so another click retries them.
                selectedChats.clear();
                failed.forEach((chatId) => selectedChats.add(chatId));
                addCheckboxes();
                return;
            }
        }
        removeCheckboxes();
        isCheckboxMode = false;
    }

    function setDeleting(deleting) {
        isDeleting = deleting;
        bulkDeleteButton.disabled = deleting;
        bulkDeleteButton.style.opacity = deleting ? "0.5" : "1";
        bulkDeleteButton.style.cursor = deleting ? "wait" : "pointer";
    }

    // Initialize floating button
    function initialize() {
        if (!bulkDeleteButton) {
            bulkDeleteButton = createBulkDeleteButton();
            document.body.appendChild(bulkDeleteButton);
            return true;
        }
        return false;
    }

    initialize();
})();
