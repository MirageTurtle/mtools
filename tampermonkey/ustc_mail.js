// ==UserScript==
// @name         中国科学技术大学邮箱域名自动更正
// @namespace    https://mirageturtle.top
// @version      1.0
// @description  自动更正邮箱登录页面的域名
// @author       MirageTurtle
// @match        *://mail.ustc.edu.cn
// @run-at       document-end
// @grant        none
// ==/UserScript==

function initCorrector() {
	console.log("USTC Mail Script Loaded");
	// domain
	const domainInput = document.querySelector("#domain");

	// username
	const usernameInput = document.querySelector("#uid");
	if (domainInput && usernameInput) {
		// listen for changes in the username input
		// if the username contains an email address, extract the part before the '@' symbol
		usernameInput.addEventListener("input", function () {
			const emailRegex = /^(.+)@(mail\.)?ustc\.edu\.cn$/i;
			if (emailRegex.test(usernameInput.value)) {
				const match = usernameInput.value.match(emailRegex);
				domainInput.value = match[2] + "ustc.edu.cn";
				usernameInput.value = match[1];
			}
		});
	}
}

(function () {
	"use strict";

	window.addEventListener("load", function () {
		setTimeout(initCorrector, 1000);
	});
})();
