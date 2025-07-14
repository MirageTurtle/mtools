// ==UserScript==
// @name         Google搜索语言限制器
// @namespace    https://mirageturtle.top/
// @version      1.0
// @description  为Google搜索添加快速语言筛选功能
// @author       You
// @match        https://www.google.com/search*
// @match        https://www.google.com.hk/search*
// @match        https://www.google.co.jp/search*
// @match        https://www.google.de/search*
// @match        https://www.google.fr/search*
// @match        https://www.google.co.uk/search*
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	// 支持的语言列表
	const languages = {
		all: "所有语言",
		"zh-CN": "中文",
		en: "英文",
		// ja: "日文",
		// ko: "韩文",
		// de: "德文",
		// fr: "法文",
		// es: "西班牙文",
		// it: "意大利文",
		// pt: "葡萄牙文",
		// ru: "俄文",
		// ar: "阿拉伯文",
		// hi: "印地文",
		// th: "泰文",
		// vi: "越南文",
	};

	// 获取当前URL中的语言参数
	function getCurrentLanguage() {
		const urlParams = new URLSearchParams(window.location.search);
		const lr = urlParams.get("lr");
		if (!lr) return "all";
		return lr.replace("lang_", "");
	}

	// 更新URL中的语言参数
	function updateLanguageFilter(lang) {
		const url = new URL(window.location);

		if (lang === "all") {
			url.searchParams.delete("lr");
		} else {
			url.searchParams.set("lr", "lang_" + lang);
		}

		window.location.href = url.toString();
	}

	// 创建语言选择器
	function createLanguageSelector() {
		const container = document.createElement("div");
		container.id = "lang-filter-container";
		container.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: white;
            border: 1px solid #dadce0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            padding: 10px;
            font-family: arial, sans-serif;
            font-size: 14px;
            min-width: 140px;
        `;

		const title = document.createElement("div");
		title.textContent = "语言筛选";
		title.style.cssText = `
            font-weight: bold;
            margin-bottom: 8px;
            color: #3c4043;
            font-size: 13px;
        `;

		const select = document.createElement("select");
		select.style.cssText = `
            width: 100%;
            padding: 6px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            font-size: 14px;
            background: white;
            color: #3c4043;
        `;

		const currentLang = getCurrentLanguage();

		// 添加选项
		Object.entries(languages).forEach(([code, name]) => {
			const option = document.createElement("option");
			option.value = code;
			option.textContent = name;
			if (code === currentLang) {
				option.selected = true;
			}
			select.appendChild(option);
		});

		// 添加事件监听器
		select.addEventListener("change", function () {
			updateLanguageFilter(this.value);
		});

		// 添加收起/展开功能
		const toggleBtn = document.createElement("button");
		toggleBtn.textContent = "语言";
		toggleBtn.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #1a73e8;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            z-index: 1001;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        `;

		let isExpanded = false;

		toggleBtn.addEventListener("click", function () {
			if (isExpanded) {
				container.style.display = "none";
				toggleBtn.textContent = "语言";
			} else {
				container.style.display = "block";
				toggleBtn.textContent = "收起";
			}
			isExpanded = !isExpanded;
		});

		// 鼠标悬停效果
		toggleBtn.addEventListener("mouseover", function () {
			this.style.background = "#1557b0";
		});

		toggleBtn.addEventListener("mouseout", function () {
			this.style.background = "#1a73e8";
		});

		container.appendChild(title);
		container.appendChild(select);

		// 默认隐藏容器
		container.style.display = "none";

		document.body.appendChild(toggleBtn);
		document.body.appendChild(container);

		// 点击其他地方时隐藏
		document.addEventListener("click", function (e) {
			if (!container.contains(e.target) && e.target !== toggleBtn) {
				container.style.display = "none";
				toggleBtn.textContent = "语言";
				isExpanded = false;
			}
		});
	}

	// 添加当前语言状态显示
	function addLanguageStatus() {
		const currentLang = getCurrentLanguage();
		if (currentLang !== "all") {
			const statusDiv = document.createElement("div");
			statusDiv.style.cssText = `
                position: fixed;
                top: 50px;
                right: 20px;
                background: #e8f0fe;
                color: #1a73e8;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 12px;
                z-index: 999;
                border: 1px solid #dadce0;
            `;
			statusDiv.textContent = `当前: ${languages[currentLang] || currentLang}`;
			document.body.appendChild(statusDiv);
		}
	}

	// 等待页面加载完成后初始化
	function init() {
		// 确保搜索结果页面已经加载
		if (document.querySelector("#search") || document.querySelector("#res")) {
			addLanguageStatus();
			createLanguageSelector();
		}
	}

	// 页面加载完成后运行
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

	// 处理Google的动态加载
	let observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				// 检查是否添加了搜索结果
				for (let node of mutation.addedNodes) {
					if (
						node.nodeType === 1 &&
						(node.id === "search" || node.id === "res")
					) {
						init();
						break;
					}
				}
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
})();
