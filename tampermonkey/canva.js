// ==UserScript==
// @name         Canva Image Finder
// @namespace    https://mirageturtle.top
// @version      1.0
// @description  Find and open specific images on Canva in new tabs
// @author       DeepSeek & MirageTurtle
// @match        https://www.canva.com/*
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	// Function to check if src matches excluded patterns
	function isAllowedSrc(src) {
		// const excludedPatterns = [
		// 	"https://template.canva.com",
		// 	"https://thirdparty-public-apps-media.canva-apps.com",
		// 	"https://static.canva.com",
		// ];
		// return !excludedPatterns.some((pattern) => src.startsWith(pattern));
		// Only open blob: src
		return src.startsWith("blob:");
	}

	// Function to find and open matching images
	function findAndOpenImages() {
		const images = document.querySelectorAll('img[draggable="false"]');
		let foundCount = 0;
		// foundImages is a set to avoid duplicates
		let foundImages = [];

		images.forEach((img) => {
			if (img.alt && img.alt !== "" && img.src && isAllowedSrc(img.src)) {
				// window.open(img.src, "_blank");
				// foundCount++;
				if (!foundImages.includes(img.src)) {
					foundImages.push(img.src);
					window.open(img.src, "_blank");
					foundCount++;
				}
			}
		});

		console.log(`Found and opened ${foundCount} matching images.`);
		const feedbackDelay = 5000; // Delay milliseconds for feedback
		// Provide feedback
		if (foundCount > 0) {
			button.textContent = `Opened ${foundCount} images!`;
			setTimeout(() => {
				button.textContent = "Find Images";
				button.style.backgroundColor = "#00a4ff";
			}, feedbackDelay);
		} else {
			button.textContent = "No images found";
			button.style.backgroundColor = "#ff5555";
			setTimeout(() => {
				button.textContent = "Find Images";
				button.style.backgroundColor = "#00a4ff";
			}, feedbackDelay);
		}
	}

	// Create and style the button
	function addButton() {
		const button = document.createElement("button");
		button.textContent = "Find Images";

		// Styling to make it compact and non-obtrusive
		button.style.position = "fixed";
		button.style.top = "80px";
		button.style.right = "80px";
		button.style.zIndex = "9999";
		button.style.padding = "6px 10px";
		button.style.fontSize = "12px";
		button.style.backgroundColor = "#00a4ff";
		button.style.color = "white";
		button.style.border = "none";
		button.style.borderRadius = "4px";
		button.style.cursor = "pointer";
		button.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
		button.style.opacity = "0.9";
		button.style.transition = "all 0.2s";

		// Hover effects
		button.addEventListener("mouseover", () => {
			button.style.opacity = "1";
			button.style.transform = "scale(1.05)";
		});
		button.addEventListener("mouseout", () => {
			button.style.opacity = "0.9";
			button.style.transform = "scale(1)";
		});

		button.addEventListener("click", findAndOpenImages);

		document.body.appendChild(button);
		return button;
	}

	// Wait for the page to load before adding the button
	let button;
	window.addEventListener("load", () => {
		button = addButton();
		// Additional check after 5 seconds in case of dynamic loading
		setTimeout(() => {
			if (!document.body.contains(button)) {
				button = addButton();
			}
		}, 5000);
	});

	// Alternatively, run automatically after a delay
	// setTimeout(findAndOpenImages, 5000);
})();
