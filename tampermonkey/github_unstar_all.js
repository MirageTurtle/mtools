// ==UserScript==
// @name         GitHub Unstar All Repos
// @namespace    https://mirageturtle.top
// @version      1.0
// @description  Unstar all repositories on the current GitHub page
// @author       MirageTurtle
// @match        https://github.com/stars*
// @match        https://github.com/*/starred*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Function to find and unstar all starred repositories
    function unstarAllRepos() {
        // Find all star buttons that are currently starred (have "Starred" text)
        const allButtons = document.querySelectorAll('button');
        const starButtons = Array.from(allButtons).filter(button =>
            button.textContent.includes('Starred') ||
            button.querySelector('span')?.textContent.includes('Starred')
        );
        let unstarredCount = 0;

        if (starButtons.length === 0) {
            console.log("No starred repositories found on this page.");
            updateButtonFeedback("No starred repos found", "#ff9500");
            return;
        }

        // Click each unstar button with a small delay to avoid rate limiting
        starButtons.forEach((button, index) => {
            setTimeout(() => {
                button.click();
                unstarredCount++;
                console.log(
                    `Unstarred repository ${unstarredCount}/${starButtons.length}`,
                );

                // Update button text with progress
                if (button) {
                    button.textContent = `Unstarring... (${unstarredCount}/${starButtons.length})`;
                }

                // Final feedback when all are processed
                if (unstarredCount === starButtons.length) {
                    updateButtonFeedback(
                        `Unstarred ${unstarredCount} repos!`,
                        "#28a745",
                    );
                }
            }, index * 200); // 200ms delay between each click
        });

        console.log(`Started unstarring ${starButtons.length} repositories.`);
    }

    // Function to update button feedback
    function updateButtonFeedback(text, color) {
        if (button) {
            button.textContent = text;
            button.style.backgroundColor = color;
            setTimeout(() => {
                button.textContent = "Unstar All";
                button.style.backgroundColor = "#dc3545";
            }, 3000);
        }
    }

    // Create and style the button
    function addButton() {
        const button = document.createElement("button");
        button.textContent = "Unstar All";

        // Styling to make it compact and visible
        button.style.position = "fixed";
        button.style.top = "80px";
        button.style.right = "20px";
        button.style.zIndex = "9999";
        button.style.padding = "8px 12px";
        button.style.fontSize = "13px";
        button.style.backgroundColor = "#dc3545";
        button.style.color = "white";
        button.style.border = "none";
        button.style.borderRadius = "6px";
        button.style.cursor = "pointer";
        button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        button.style.opacity = "0.9";
        button.style.transition = "all 0.2s";
        button.style.fontWeight = "bold";

        // Hover effects
        button.addEventListener("mouseover", () => {
            button.style.opacity = "1";
            button.style.transform = "scale(1.05)";
        });
        button.addEventListener("mouseout", () => {
            button.style.opacity = "0.9";
            button.style.transform = "scale(1)";
        });

        // Add confirmation dialog
        button.addEventListener("click", () => {
            const allButtons = document.querySelectorAll('button');
            const starButtons = Array.from(allButtons).filter(button =>
                button.textContent.includes('Starred') ||
                button.querySelector('span')?.textContent.includes('Starred')
            );
            if (starButtons.length === 0) {
                updateButtonFeedback("No starred repos found", "#ff9500");
                return;
            }

            const confirmed = confirm(
                `Are you sure you want to unstar ${starButtons.length} repositories? This action cannot be undone.`,
            );
            if (confirmed) {
                unstarAllRepos();
            }
        });

        document.body.appendChild(button);
        return button;
    }

    // Wait for the page to load before adding the button
    let button;

    function initializeScript() {
        // Check if we're on a page that likely has starred repos
        if (
            window.location.href.includes("/stars") ||
            window.location.href.includes("/starred")
        ) {
            button = addButton();
        }
    }

    // Initialize when page loads
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeScript);
    } else {
        initializeScript();
    }

    // Also handle navigation changes (GitHub uses AJAX navigation)
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            // Remove existing button if it exists
            if (button && document.body.contains(button)) {
                button.remove();
            }
            // Re-initialize if on appropriate page
            setTimeout(initializeScript, 1000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
