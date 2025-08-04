// ==UserScript==
// @name         Notion Chinese Brackets to Checkbox
// @namespace    https://mirageturtle.top
// @version      1.0
// @description  Convert Chinese square brackets to Latin square brackets (checkboxes) in Notion
// @author       MirageTurtle
// @match        https://www.notion.so/*
// @match        https://notion.so/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let lastInputTime = 0;
    let processTimeout = null;

    // Function to get the current cursor position and text content
    function getCurrentTextAndCursor() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const container = range.startContainer;

        // Find the text node and its parent editable element
        let textNode = container;
        let editableElement = container;

        // Find the editable parent
        while (
            editableElement &&
            !editableElement.isContentEditable &&
            editableElement !== document.body
        ) {
            editableElement = editableElement.parentNode;
        }

        if (!editableElement || !editableElement.isContentEditable) {
            return null;
        }

        // Get text content
        let text = "";
        let cursorOffset = 0;

        if (textNode.nodeType === Node.TEXT_NODE) {
            text = textNode.textContent;
            cursorOffset = range.startOffset;
        } else {
            text = editableElement.textContent || "";
            cursorOffset = text.length;
        }

        return {
            textNode,
            editableElement,
            text,
            cursorOffset,
            range,
        };
    }

    // Function to replace text and maintain cursor position
    function replaceTextAtCursor(info, searchText, replaceText) {
        const { textNode, text, cursorOffset, range } = info;

        // Find the position of the search text near the cursor
        const beforeCursor = text.substring(0, cursorOffset);
        const searchIndex = beforeCursor.lastIndexOf(searchText);

        if (searchIndex !== -1) {
            // Calculate new cursor position (after the [])
            const newCursorPos = searchIndex + replaceText.length;

            // Replace the text
            const newText =
                text.substring(0, searchIndex) +
                replaceText +
                text.substring(searchIndex + searchText.length);

            if (textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = newText;

                // Restore cursor position
                try {
                    range.setStart(textNode, newCursorPos);
                    range.setEnd(textNode, newCursorPos);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    // Fallback: position at end
                    range.setStart(textNode, textNode.textContent.length);
                    range.setEnd(textNode, textNode.textContent.length);
                }
            }

            return true;
        }

        return false;
    }

    // Function to process text replacement
    function processTextReplacement() {
        const info = getCurrentTextAndCursor();
        if (!info) return;

        // Check for Chinese brackets pattern
        if (info.text.includes("【】")) {
            if (replaceTextAtCursor(info, "【】", "[]")) {
                // Trigger Notion's processing by dispatching input event
                const inputEvent = new InputEvent("input", {
                    bubbles: true,
                    cancelable: true,
                    inputType: "insertText",
                    data: "]",
                });
                info.editableElement.dispatchEvent(inputEvent);
            }
        }
    }

    // Debounced input handler
    function handleInput(event) {
        lastInputTime = Date.now();

        // Clear previous timeout
        if (processTimeout) {
            clearTimeout(processTimeout);
        }

        // Set a short delay to allow the input to be processed
        processTimeout = setTimeout(() => {
            // Only process if this was the last input event
            if (Date.now() - lastInputTime >= 50) {
                processTextReplacement();
            }
        }, 50);
    }

    // Alternative approach using MutationObserver for more reliable detection
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (
                    mutation.type === "childList" ||
                    mutation.type === "characterData"
                ) {
                    // Check if any text nodes contain Chinese brackets
                    const checkNode = (node) => {
                        if (
                            node.nodeType === Node.TEXT_NODE &&
                            node.textContent.includes("【】")
                        ) {
                            // Small delay to let Notion finish processing
                            setTimeout(() => {
                                const newText = node.textContent.replace(
                                    /【】/g,
                                    "[]",
                                );
                                if (newText !== node.textContent) {
                                    const oldText = node.textContent;
                                    node.textContent = newText;

                                    // Position cursor at the end of the replaced text
                                    const selection = window.getSelection();
                                    if (selection.rangeCount > 0) {
                                        const range = selection.getRangeAt(0);
                                        // Find the position where the replacement occurred
                                        const replacementIndex = oldText.indexOf("【】");
                                        if (replacementIndex !== -1) {
                                            const newCursorPos = replacementIndex + 2; // Position after []
                                            try {
                                                range.setStart(node, newCursorPos);
                                                range.setEnd(node, newCursorPos);
                                                selection.removeAllRanges();
                                                selection.addRange(range);
                                            } catch (e) {
                                                // Fallback: position at end of text
                                                range.setStart(node, node.textContent.length);
                                                range.setEnd(node, node.textContent.length);
                                            }
                                        }
                                    }

                                    // Trigger Notion's processing
                                    const parent = node.parentElement;
                                    if (parent && parent.isContentEditable) {
                                        const inputEvent = new InputEvent(
                                            "input",
                                            {
                                                bubbles: true,
                                                cancelable: true,
                                                inputType: "insertText",
                                            },
                                        );
                                        parent.dispatchEvent(inputEvent);
                                    }
                                }
                            }, 10);
                        } else if (node.childNodes) {
                            node.childNodes.forEach(checkNode);
                        }
                    };

                    if (mutation.addedNodes) {
                        mutation.addedNodes.forEach(checkNode);
                    }
                    if (mutation.target) {
                        checkNode(mutation.target);
                    }
                }
            }
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        return observer;
    }

    // Initialize the script
    function init() {
        // Method 1: Input event listener
        document.addEventListener("input", handleInput, true);

        // Method 2: MutationObserver for more comprehensive coverage
        setupMutationObserver();

        console.log("Notion Chinese Brackets to Checkbox script v1.0 loaded");
    }

    // Wait for page to load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Also initialize after a delay to handle dynamic content
    setTimeout(init, 1000);
})();
