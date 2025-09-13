// ==UserScript==
// @name         WordReference Add Chinese Link (prepend)
// @namespace    https://mirageturtle.top/
// @version      1.0
// @description  Add link to Chinese page link for WordReference
// @author       ChatGPT & MirageTurtle
// @match        https://www.wordreference.com/definition/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Get the word
    const pathParts = window.location.pathname.split("/");
    const word = pathParts[pathParts.length - 1];

    // get the target div
    const whLinksDiv = document.getElementById("WHlinks");

    if (whLinksDiv) {
        // create the <a> element
        const link = document.createElement("a");
        link.href = `/enzh/${word}`;
        link.textContent = "in Chinese";

        // Add separator
        const separator = document.createTextNode(" | ");

        // Get the first element of div, assumed not as null
        const firstChild = whLinksDiv.firstChild;

        // Add separator and the link
        whLinksDiv.insertBefore(separator, firstChild);
        whLinksDiv.insertBefore(link, separator);
    }
})();
