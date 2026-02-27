// ==UserScript==
// @name         bulk_delete_chatgpt
// @namespace    https://mirageturtle.top
// @version      1.0
// @description  Add bulk delete to chat gpt
// @author       MirageTurtle
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Variables to store selected status
    let selectedChats = new Set();
    let isCheckboxMode = false;
    let bulkDeleteButton = null;
    let lastClickedCheckbox = null;  // Track last clicked checkbox for range selection
    let checkboxOrder = [];          // Maintain ordered list of checkboxes for range calculation

    // Function to create button with bin icon
    function createBulkDeleteButton() {
        const button = document.createElement("button");
        button.id = "bulk-delete-btn";
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        button.style.cssText = `
            padding: 8px;
            margin: 8px 0;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            background: transparent;
            color: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        button.addEventListener("click", handleButtonClick);
        return button;
    }

    // Function to add checkboxes
    function addCheckboxes() {
        checkboxOrder = []; // Reset order array
        const historyDiv = document.getElementById("history");
        if (!historyDiv) return;

        const chatLinks = historyDiv.querySelectorAll('a[href^="/c/"]');
        chatLinks.forEach((link) => {
            if (link.querySelector(".bulk-checkbox")) return;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "bulk-checkbox";
            checkbox.style.cssText = "margin-right: 8px; cursor: pointer;";

            const chatId = link.href.split("/c/")[1];
            checkbox.dataset.chatId = chatId;

            checkboxOrder.push(checkbox); // Maintain order

            checkbox.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();

                setTimeout(() => {
                    if (e.shiftKey && lastClickedCheckbox) {
                        handleRangeSelection(e.target, lastClickedCheckbox);
                    } else {
                        handleSingleSelection(e.target);
                    }
                    lastClickedCheckbox = e.target;
                }, 1);
            });

            link.insertAdjacentElement("afterbegin", checkbox);
        });
    }

    // Function to remove checkboxes
    function removeCheckboxes() {
        const checkboxes = document.querySelectorAll(".bulk-checkbox");
        checkboxes.forEach((checkbox) => checkbox.remove());
        selectedChats.clear();
        // Reset range selection state
        lastClickedCheckbox = null;
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

    // Main deleting function
    async function deleteSelectedChats() {
        if (selectedChats.size === 0) return;

        try {
            const token = await getAuthToken();

            // Create all delete promises at once (parallel execution)
            const deletePromises = Array.from(selectedChats).map(async (chatId) => {
                try {
                    const response = await fetch(buildDeleteUrl(chatId), {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ is_visible: false }),
                    });

                    if (response.ok) {
                        // Remove the chat element from DOM
                        const chatLink = document.querySelector(
                            `a[href="/c/${chatId}"]`,
                        );
                        if (chatLink) {
                            chatLink.closest("a").remove();
                        }
                        return { chatId, success: true };
                    } else {
                        return { chatId, success: false, error: `HTTP ${response.status}` };
                    }
                } catch (error) {
                    console.error(`Failed to delete chat ${chatId}:`, error);
                    return { chatId, success: false, error: error.message };
                }
            });

            // Wait for all deletions to complete
            const results = await Promise.allSettled(deletePromises);

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            console.log(`Deletion complete: ${successful} successful, ${failed} failed`);
        } catch (error) {
            console.error("Failed to delete chats:", error);
        }
    }

    function handleRangeSelection(currentCheckbox, lastCheckbox) {
        const currentIndex = checkboxOrder.indexOf(currentCheckbox);
        const lastIndex = checkboxOrder.indexOf(lastCheckbox);

        if (currentIndex === -1 || lastIndex === -1) {
            // Fallback to single selection if indices not found
            handleSingleSelection(currentCheckbox);
            return;
        }

        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);

        // Determine target state based on current checkbox
        const targetState = !currentCheckbox.checked;

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

    function handleSingleSelection(checkbox) {
        const chatId = checkbox.dataset.chatId;
        checkbox.checked = !checkbox.checked;

        if (checkbox.checked) {
            selectedChats.add(chatId);
        } else {
            selectedChats.delete(chatId);
        }
    }

    // Button click handler
    async function handleButtonClick() {
        if (!isCheckboxMode) {
            // First click: add checkboxes
            addCheckboxes();
            isCheckboxMode = true;
        } else {
            // Second click: delete selected or just remove checkboxes
            if (selectedChats.size > 0) {
                await deleteSelectedChats();
            }
            removeCheckboxes();
            isCheckboxMode = false;
        }
    }

    // Initialize when nav is ready
    function initialize() {
        const nav = document.querySelector("nav");
        const navDiv = nav?.querySelector("div");
        if (navDiv && !bulkDeleteButton) {
            bulkDeleteButton = createBulkDeleteButton();
            navDiv.insertAdjacentElement("afterend", bulkDeleteButton);
            return true; // Success
        }
        return false; // Not ready yet
    }

    // Try to initialize immediately
    if (!initialize()) {
        // If not ready, use MutationObserver instead of setInterval
        const observer = new MutationObserver(() => {
            if (initialize()) {
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
