//check if content is loaded
console.log("✅ PromptLog: content.js loaded");

let hasInjected = false;
const sidebarWidth = 300;

function extractUserMessages() {
	const messages = [];
	const userMessageNodes = document.querySelectorAll(
		'div[data-message-author-role="user"]'
	);

	userMessageNodes.forEach((node, index) => {
		const textElement = node.querySelector(".whitespace-pre-wrap");
		if (textElement && textElement.innerText.trim()) {
			const text = textElement.innerText.trim();
			messages.push({ text, index });
		} else {
			console.warn(
				"PromptLog: A user message node was found but its text was empty."
			);
		}
	});

	return messages;
}

function postMessagesToSidebar(userMessages) {
	const iframe = document.getElementById("promptlog-sidebar");
	if (!iframe) {
		console.error(
			"PromptLog: Could not find the sidebar iframe to post messages."
		);
		return;
	}

	console.log(
		`PromptLog: Posting ${userMessages.length} messages to sidebar...`
	);
	if (userMessages && userMessages.length > 0) {
		userMessages.forEach((msg) => {
			iframe.contentWindow.postMessage(
				{ type: "NEW_USER_MESSAGE", data: msg.text, index: msg.index },
				"*"
			);
		});
	}
}

function injectSidebar(userMessages) {
	if (hasInjected) {
		console.log("PromptLog: Sidebar already injected.");
		return;
	}
	hasInjected = true;
	console.log("PromptLog: Injecting sidebar and docking to page...");

	const sidebarWidthPx = `${sidebarWidth}px`;
	const htmlElement = document.documentElement;

	htmlElement.style.transition = "margin-right 0.4s ease-in-out";
	htmlElement.style.marginRight = sidebarWidthPx;

	const iframe = document.createElement("iframe");
	iframe.id = "promptlog-sidebar"; // Unique ID
	iframe.src = chrome.runtime.getURL("sidebar.html");
	iframe.style.cssText = `
		position: fixed;
		top: 0;
		right: 0;
		width: ${sidebarWidthPx};
		height: 100%;
		background-color: white;
		z-index: 2147483647;
		border: none;
		border-left: 1px solid #ccc;
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
	`;

	iframe.onload = () => {
		console.log("PromptLog: Iframe loaded.");
		postMessagesToSidebar(userMessages);
	};

	document.body.appendChild(iframe);
}

function tryToInjectSidebar() {
	if (hasInjected) return;
	const messages = extractUserMessages();
	if (messages.length > 0) {
		console.log(
			`PromptLog: Success! Extracted ${messages.length} user messages.`
		);
		injectSidebar(messages);
		if (observer) {
			observer.disconnect();
			console.log("PromptLog: MutationObserver disconnected.");
		}
	}
}

let observer;

function startObserver() {
	const mainContainer = document.querySelector("main");
	if (!mainContainer) {
		setTimeout(startObserver, 500);
		return;
	}
	observer = new MutationObserver(tryToInjectSidebar);
	observer.observe(mainContainer, { childList: true, subtree: true });
	tryToInjectSidebar();
}

// --- Main Execution ---
startObserver();

// --- Listen for all messages from the sidebar iframe ---
window.addEventListener("message", (event) => {
	if (
		event.source !== document.getElementById("promptlog-sidebar")?.contentWindow
	) {
		// Ignore messages that are not from our sidebar iframe
		return;
	}

	// Handle SCROLL_TO_MESSAGE request
	if (event.data.type === "SCROLL_TO_MESSAGE") {
		const { index } = event.data;
		const userMessageNodes = document.querySelectorAll(
			'div[data-message-author-role="user"]'
		);
		const targetNode = userMessageNodes[index];
		if (targetNode) {
			targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
			targetNode.style.transition = "background-color 0.3s ease";
			targetNode.style.backgroundColor = "#eef5ff";
			setTimeout(() => {
				targetNode.style.backgroundColor = "";
			}, 2000);
		}
	}

	//Handle REFRESH request
	if (event.data.type === "REQUEST_REFRESH") {
		console.log("PromptLog: Refresh requested from sidebar.");
		const messages = extractUserMessages();
		postMessagesToSidebar(messages);
	}
});
