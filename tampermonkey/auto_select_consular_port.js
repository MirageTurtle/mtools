// ==UserScript==
// @name         Auto Select Consular Post
// @version      1.2
// @description  Auto switch select option
// @match        https://www.usvisascheduling.com/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    function showToast(message) {
        const toast = document.createElement("div");

        toast.textContent = message;

        Object.assign(toast.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "8px",
            zIndex: "999999",
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            transition: "opacity 0.3s ease",
            opacity: "1",
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";

            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2500);
    }

    function triggerChange(select) {
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    async function handleSelect() {
        const select = document.querySelector("#post_select");

        if (!select) {
            showToast("未找到 #post_select");
            return;
        }

        // 先清空
        select.value = "";
        triggerChange(select);

        // 等待 AJAX 更新
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 获取有效 option
        const validOptions = [...select.options].filter(
            (option) => option.value && option.value.trim() !== "",
        );

        if (validOptions.length === 0) {
            showToast("没有可用的 Consular Post");
            return;
        }

        if (validOptions.length > 1) {
            showToast(`发现 ${validOptions.length} 个有效选项`);
            return;
        }

        // 自动选择
        select.value = validOptions[0].value;
        triggerChange(select);

        showToast(`已选择: ${validOptions[0].text}`);
    }

    function createButton() {
        // 找按钮区域
        const container = document.querySelector(".col-sm-12.mt-3");

        if (!container) {
            console.error("未找到按钮容器");
            return;
        }

        // 防止重复创建
        if (document.querySelector("#auto_select_btn")) {
            return;
        }

        const btn = document.createElement("button");

        btn.id = "auto_select_btn";
        btn.type = "button";
        btn.textContent = "Auto Select";

        // 复用网站原本按钮样式
        btn.className = "btn-atlas btn-atlas-submit pull-right";

        // 与 Submit 按钮保持间距
        btn.style.marginRight = "10px";

        btn.addEventListener("click", handleSelect);

        // 插入到 Submit 按钮前面
        const submitBtn = document.querySelector("#submitbtn");

        if (submitBtn) {
            submitBtn.insertAdjacentElement("afterend", btn);
        } else {
            container.appendChild(btn);
        }
    }

    const observer = new MutationObserver(() => {
        const container = document.querySelector(".col-sm-12.mt-3");
        if (container) {
            createButton();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
