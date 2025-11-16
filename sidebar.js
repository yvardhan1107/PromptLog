//check if it is injected
console.log("✅ PromptLog: sidebar.js loaded");

const messageList = document.getElementById("message-list");
const searchBar = document.getElementById("search-bar");
const refreshBtn = document.getElementById("refresh-btn");
const themeToggleBtn = document.getElementById("theme-toggle");
const body = document.body;

/**
 * Applies the saved theme from localStorage or defaults to light theme.
 */
function applyInitialTheme() {
	const savedTheme = localStorage.getItem("promptlog-theme");
	if (savedTheme === "dark") {
		body.classList.add("dark-theme");
	}
}

/**
 * Handles incoming messages from the content script.
 */
window.addEventListener("message", (event) => {
	if (event.source !== window.parent) return;

	if (event.data.type === "NEW_USER_MESSAGE") {
		const { data, index } = event.data;
		const listItem = document.createElement("li");
		listItem.className = "message-item";
		listItem.dataset.index = index;
		listItem.innerHTML = `
            <span class="serial-number">${index + 1}.</span>
            <span class="message-text">${data}</span>
        `;
		listItem.title = data;
		messageList.appendChild(listItem);
	}
});

/**
 * Sets up all the event listeners for the sidebar UI.
 */
function setupEventListeners() {
	// Search bar functionality
	searchBar.addEventListener("input", () => {
		const searchTerm = searchBar.value.toLowerCase();
		const items = messageList.getElementsByTagName("li");
		for (const item of items) {
			const itemText = item.textContent.toLowerCase();
			item.style.display = itemText.includes(searchTerm) ? "flex" : "none";
		}
	});

	// Refresh button functionality
	refreshBtn.addEventListener("click", () => {
		messageList.innerHTML = "";
		window.parent.postMessage({ type: "REQUEST_REFRESH" }, "*");
	});

	// Theme toggle functionality
	themeToggleBtn.addEventListener("click", () => {
		body.classList.toggle("dark-theme");
		// Save the new theme preference to localStorage
		const newTheme = body.classList.contains("dark-theme") ? "dark" : "light";
		localStorage.setItem("promptlog-theme", newTheme);
	});

	// Click handler for message items (Event Delegation)
	messageList.addEventListener("click", (event) => {
		const clickedItem = event.target.closest(".message-item");
		if (clickedItem) {
			const index = parseInt(clickedItem.dataset.index, 10);
			window.parent.postMessage(
				{ type: "SCROLL_TO_MESSAGE", index: index },
				"*"
			);
		}
	});
}

// --- Main Execution ---
applyInitialTheme();
setupEventListeners();
