
/* =========================================
   AI WORKSPACE - COMPLETE API FRONTEND
========================================= */

const API_BASE = "http://localhost:5000/api/service";

// APPLICATION STATE
let folders = [];
let questions = [];

let currentFolderId = null;
let currentPage = "dashboard";
let currentQuestionId = null;

// DOM ELEMENTS
const mainContent = document.getElementById("mainContent");
const folderList = document.getElementById("folderList");
const pageTitle = document.getElementById("pageTitle");

const folderModal = document.getElementById("folderModal");
const folderNameInput = document.getElementById("folderName");


// =========================================
// API HELPER
// =========================================

async function apiRequest(endpoint, options = {}) {

    try {

        const response = await fetch(`${API_BASE}${endpoint}`, {

            credentials: "include",

            ...options,

            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }

        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || "API request failed");
        }

        return result;

    } catch (error) {

        console.error("API Error:", error);
        throw error;

    }

}


// =========================================
// COMMON HELPERS
// =========================================

function escapeHTML(value = "") {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}

function getFolderId(folder) {
    return folder?._id || folder?.id;
}

function getQuestionId(question) {
    return question?._id || question?.id;
}

function getFolderName(folder) {
    return folder?.folderName || folder?.name || "Untitled Folder";
}

function getQuestionText(question) {
    return question?.question || question?.content || "";
}

function getAnswerText(question) {
    return question?.answer || "";
}

function getQuestionFolderId(question) {

    if (!question?.folder) return null;

    if (typeof question.folder === "object") {
        return question.folder._id;
    }

    return question.folder;

}

function getFolder(id) {
    return folders.find(folder => getFolderId(folder) === id);
}

function getQuestion(id) {
    return questions.find(question => getQuestionId(question) === id);
}

function getFolderQuestions(folderId) {

    return questions.filter(
        question => getQuestionFolderId(question) === folderId
    );

}

function showError(error) {

    console.error(error);

    alert(error.message || "Something went wrong");

}


// =========================================
// MARKDOWN RENDERER
// =========================================

function renderMarkdown(content = "") {

    if (!content) return "";

    const rawHTML = marked.parse(content, {

        gfm: true,
        breaks: true

    });

    return DOMPurify.sanitize(rawHTML);

}


function highlightCode() {

    document.querySelectorAll(
        ".markdown-content pre code"
    ).forEach(block => {

        hljs.highlightElement(block);

    });

}


// =========================================
// LOAD DATA FROM MONGODB
// =========================================

async function loadFolders() {

    const result = await apiRequest("/getFolder", {
        method: "GET"
    });

    folders = result.data || [];

    return folders;

}


async function loadFiles(folderId = null) {

    const query = folderId
        ? `?folderId=${encodeURIComponent(folderId)}`
        : "";

    const result = await apiRequest(`/getFiles${query}`, {
        method: "GET"
    });

    return result.data || [];

}


async function loadAllData() {

    try {

        await loadFolders();

        const fileResults = await Promise.all(

            folders.map(folder =>
                loadFiles(getFolderId(folder))
            )

        );

        questions = fileResults.flat();

        renderFolders();

    } catch (error) {

        showError(error);

    }

}


// =========================================
// SIDEBAR FOLDERS
// =========================================

function renderFolders() {

    folderList.innerHTML = "";

    if (!folders.length) {

        folderList.innerHTML = `
            <p class="empty-folders">
                No folders yet. Create your first folder.
            </p>
        `;

        return;

    }

    folders.forEach(folder => {

        const folderId = getFolderId(folder);
        const folderName = getFolderName(folder);

        const count = getFolderQuestions(folderId).length;

        const item = document.createElement("div");

        item.className =
            "folder-item" +
            (currentFolderId === folderId ? " active" : "");

        item.innerHTML = `

            <span>📁</span>

            <span class="folder-name">
                ${escapeHTML(folderName)}
            </span>

            <span class="folder-count">
                ${count}
            </span>

            <button
                class="delete-folder-btn"
                title="Delete Folder"
                type="button"
            >
                🗑
            </button>

        `;

        item.addEventListener("click", () => {

            openFolder(folderId);
            closeMobileSidebar();

        });

        item.querySelector(".delete-folder-btn")
            .addEventListener("click", event => {

                event.stopPropagation();

                deleteFolder(folderId);

            });

        folderList.appendChild(item);

    });

}


// =========================================
// CREATE FOLDER
// =========================================

function openFolderModal() {

    folderNameInput.value = "";

    folderModal.classList.add("show");

    setTimeout(() => folderNameInput.focus(), 100);

}


function closeModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove("show");
    }

}


document.getElementById("createFolderBtn")
    .addEventListener("click", openFolderModal);

document.getElementById("quickFolderBtn")
    .addEventListener("click", openFolderModal);

document.getElementById("saveFolderBtn")
    .addEventListener("click", createFolder);


async function createFolder() {

    const folderName = folderNameInput.value.trim();

    if (!folderName) {

        alert("Please enter folder name.");
        return;

    }

    const saveButton = document.getElementById("saveFolderBtn");

    try {

        saveButton.disabled = true;
        saveButton.textContent = "Creating...";

        const result = await apiRequest("/createFolder", {

            method: "POST",

            body: JSON.stringify({
                folderName
            })

        });

        const newFolder = result.data;

        folders.unshift(newFolder);

        closeModal("folderModal");

        renderFolders();

        openFolder(getFolderId(newFolder));

    } catch (error) {

        showError(error);

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Create Folder";

    }

}


// =========================================
// DELETE FOLDER
// =========================================

async function deleteFolder(folderId) {

    const folder = getFolder(folderId);

    if (!folder) return;

    const folderName = getFolderName(folder);

    const confirmed = confirm(

        `Are you sure you want to delete "${folderName}"?\n\nAll questions and files inside this folder will also be deleted permanently.`

    );

    if (!confirmed) return;

    try {

        const result = await apiRequest(
            `/deleteFolder/${encodeURIComponent(folderId)}`,
            {
                method: "DELETE"
            }
        );

        // Remove folder
        folders = folders.filter(
            item => getFolderId(item) !== folderId
        );

        // Remove folder questions
        questions = questions.filter(
            question => getQuestionFolderId(question) !== folderId
        );

        // If currently opened folder is deleted
        if (currentFolderId === folderId) {

            currentFolderId = null;
            currentQuestionId = null;

            await renderDashboard();

        } else {

            renderFolders();

            if (currentPage === "dashboard") {
                await renderDashboard();
            }

        }

        alert(result.message || "Folder deleted successfully!");

    } catch (error) {

        showError(error);

    }

}


// =========================================
// MODAL EVENTS
// =========================================

document.querySelectorAll("[data-close]").forEach(button => {

    button.addEventListener("click", () => {

        closeModal(button.dataset.close);

    });

});


folderModal.addEventListener("click", event => {

    if (event.target === folderModal) {
        closeModal("folderModal");
    }

});


// =========================================
// QUESTION CARD
// =========================================

function createQuestionCard(question) {

    const card = document.createElement("div");

    card.className = "question-card";

    const questionId = getQuestionId(question);

    const questionText = getQuestionText(question);

    const answer = getAnswerText(question);

    const folderId = getQuestionFolderId(question);

    const folder = getFolder(folderId);

    const folderName = folder
        ? getFolderName(folder)
        : "Unknown folder";

    card.innerHTML = `

        <div class="folder-card-icon">📄</div>

        <h3>
            ${escapeHTML(questionText.substring(0, 60))}
        </h3>

        <p>
            ${escapeHTML(questionText.substring(0, 100))}
            ${questionText.length > 100 ? "..." : ""}
        </p>

        <p style="margin-top:12px">
            ${answer ? "✓ Answer saved" : "○ Answer pending"}
        </p>

        <p style="margin-top:8px">
            ${escapeHTML(folderName)}
        </p>

    `;

    card.addEventListener("click", () => {
        openQuestion(questionId);
    });

    return card;

}


// =========================================
// DASHBOARD
// =========================================

async function renderDashboard() {

    currentPage = "dashboard";
    currentFolderId = null;
    currentQuestionId = null;

    pageTitle.textContent = "Dashboard";

    await loadAllData();

    mainContent.innerHTML = `

        <div class="welcome-section">

            <h1>Welcome to AI Workspace ✦</h1>

            <p>
                Organize your learning, ask questions and
                save AI answers in one place.
            </p>

        </div>

        <div class="section-row">

            <h2>My Folders</h2>

            <button class="primary-btn" id="dashboardCreateFolder">
                + New Folder
            </button>

        </div>

        <div class="folder-grid" id="dashboardFolderGrid"></div>

        <div class="section-row">
            <h2>Recent Questions</h2>
        </div>

        <div class="question-grid" id="recentQuestions"></div>

    `;

    document.getElementById("dashboardCreateFolder")
        .addEventListener("click", openFolderModal);

    const grid = document.getElementById("dashboardFolderGrid");

    if (!folders.length) {

        grid.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">📁</div>

                <h3>No folders created</h3>

                <p>
                    Create a folder to start organizing your questions.
                </p>

                <button class="primary-btn" id="firstFolderBtn">
                    Create First Folder
                </button>

            </div>

        `;

        document.getElementById("firstFolderBtn")
            .addEventListener("click", openFolderModal);

    } else {

        folders.forEach(folder => {

            const folderId = getFolderId(folder);

            const folderName = getFolderName(folder);

            const count = getFolderQuestions(folderId).length;

            const card = document.createElement("div");

            card.className = "folder-card";

            card.innerHTML = `

                <div class="folder-card-header">

                    <div class="folder-card-icon">📁</div>

                    <button
                        class="delete-folder-btn"
                        title="Delete Folder"
                        type="button"
                    >
                        🗑
                    </button>

                </div>

                <h3>${escapeHTML(folderName)}</h3>

                <p>${count} Questions</p>

            `;

            card.addEventListener("click", () => {
                openFolder(folderId);
            });

            card.querySelector(".delete-folder-btn")
                .addEventListener("click", event => {

                    event.stopPropagation();

                    deleteFolder(folderId);

                });

            grid.appendChild(card);

        });

    }

    const recent = document.getElementById("recentQuestions");

    const recentQuestions = [...questions]
        .sort((a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        )
        .slice(0, 4);

    if (!recentQuestions.length) {

        recent.innerHTML = `
            <p class="muted">
                Your recent questions will appear here.
            </p>
        `;

    } else {

        recentQuestions.forEach(question => {

            recent.appendChild(createQuestionCard(question));

        });

    }

}


// =========================================
// OPEN FOLDER
// =========================================

async function openFolder(folderId) {

    try {

        currentPage = "folder";
        currentFolderId = folderId;
        currentQuestionId = null;

        const folder = getFolder(folderId);

        if (!folder) {

            alert("Folder not found");
            return;

        }

        const folderFiles = await loadFiles(folderId);

        questions = [

            ...questions.filter(
                question => getQuestionFolderId(question) !== folderId
            ),

            ...folderFiles

        ];

        pageTitle.textContent = getFolderName(folder);

        renderFolders();

        const folderName = getFolderName(folder);

        mainContent.innerHTML = `

            <div class="welcome-section">

                <p class="muted">
                    MY FOLDERS / ${escapeHTML(folderName)}
                </p>

                <h1>📁 ${escapeHTML(folderName)}</h1>

                <p>All questions saved inside this folder.</p>

            </div>

            <div class="section-row">

                <h2>Questions (${folderFiles.length})</h2>

                <button class="primary-btn" id="newQuestionBtn">
                    + New Question
                </button>

            </div>

            <div class="question-grid" id="questionGrid"></div>

        `;

        document.getElementById("newQuestionBtn")
            .addEventListener("click", renderQuestionEditor);

        const grid = document.getElementById("questionGrid");

        if (!folderFiles.length) {

            grid.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">📝</div>

                    <h3>No questions yet</h3>

                    <p>Ask your first question in this folder.</p>

                    <button class="primary-btn" id="firstQuestionBtn">
                        Create Question
                    </button>

                </div>

            `;

            document.getElementById("firstQuestionBtn")
                .addEventListener("click", renderQuestionEditor);

        } else {

            folderFiles.forEach(question => {

                grid.appendChild(createQuestionCard(question));

            });

        }

    } catch (error) {

        showError(error);

    }

}


// =========================================
// CREATE QUESTION EDITOR
// =========================================

function renderQuestionEditor() {

    const folder = getFolder(currentFolderId);

    if (!folder) return;

    currentPage = "new-question";
    currentQuestionId = null;

    pageTitle.textContent = "New Question";

    mainContent.innerHTML = `

        <div class="welcome-section">

            <p class="muted">
                ${escapeHTML(getFolderName(folder))} / New Question
            </p>

            <h1>Create New Question</h1>

            <p>
                Enter your question and generate its AI answer.
            </p>

        </div>

        <div class="editor-card">

            <label>Question Title</label>

            <input
                type="text"
                id="questionTitle"
                placeholder="Example: What is Python?"
                maxlength="150"
            >

            <label>Your Question</label>

            <textarea
                id="questionContent"
                placeholder="Write your complete question here..."
            ></textarea>

            <div class="editor-actions">

                <button class="cancel-btn" id="cancelQuestion">
                    Cancel
                </button>

                <button class="primary-btn" id="saveQuestion">
                    Generate AI Answer & Save →
                </button>

            </div>

        </div>

    `;

    document.getElementById("cancelQuestion")
        .addEventListener("click", () => {
            openFolder(getFolderId(folder));
        });

    document.getElementById("saveQuestion")
        .addEventListener("click", saveQuestion);

}


// =========================================
// GENERATE AI ANSWER AND SAVE
// =========================================

async function saveQuestion() {

    const title = document.getElementById("questionTitle")
        .value.trim();

    const content = document.getElementById("questionContent")
        .value.trim();

    if (!title || !content) {

        alert("Please enter both question title and question.");
        return;

    }

    const button = document.getElementById("saveQuestion");

    const completeQuestion = `${title}\n\n${content}`;

    try {

        button.disabled = true;
        button.textContent = "Generating AI Answer...";

        const result = await apiRequest("/airesponse", {

            method: "POST",

            body: JSON.stringify({

                question: completeQuestion,
                folderId: currentFolderId

            })

        });

        const savedFile = result.data;

        questions.unshift(savedFile);

        renderFolders();

        openQuestion(getQuestionId(savedFile));

    } catch (error) {

        showError(error);

    } finally {

        button.disabled = false;

        button.textContent = "Generate AI Answer & Save →";

    }

}


// =========================================
// OPEN INDIVIDUAL QUESTION / SLIDE
// =========================================

async function openQuestion(questionId) {

    try {

        currentPage = "slide";
        currentQuestionId = questionId;

        const result = await apiRequest(
            `/getSingleFile/${questionId}`,
            {
                method: "GET"
            }
        );

        const question = result.data;

        const index = questions.findIndex(
            item => getQuestionId(item) === questionId
        );

        if (index !== -1) {
            questions[index] = question;
        } else {
            questions.unshift(question);
        }

        const folderId = getQuestionFolderId(question);

        currentFolderId = folderId;

        const folder = getFolder(folderId);

        const questionText = getQuestionText(question);

        const answer = getAnswerText(question);

        pageTitle.textContent = questionText.substring(0, 50);

        renderFolders();

        const questionParts = questionText.split("\n\n");

        const title = questionParts[0] || "Question";

        const content = questionParts.slice(1).join("\n\n") || questionText;

        mainContent.innerHTML = `

            <div class="welcome-section">

                <p class="muted">
                    ${escapeHTML(
                        folder ? getFolderName(folder) : "Folder"
                    )} / Question
                </p>

            </div>

            <div class="slide">

                <span class="slide-label">
                    QUESTION & ANSWER · SLIDE
                </span>

                <h1>${escapeHTML(title)}</h1>

                <div class="slide-question">

                    <h3>📝 Your Question</h3>

                    <p>${escapeHTML(content)}</p>

                </div>

                <div class="slide-answer">

                    <h3>✦ AI Answer</h3>

                    ${
                        answer
                        ? `
                            <div class="markdown-content">
                                ${renderMarkdown(answer)}
                            </div>
                        `
                        : `
                            <p class="muted">
                                AI answer has not been added yet.
                            </p>
                        `
                    }

                    <label style="
                        display:block;
                        color:var(--text-secondary);
                        font-size:12px;
                        margin:20px 0 10px;
                    ">
                        Edit Answer
                    </label>

                    <textarea
                        id="answerInput"
                        style="
                            width:100%;
                            min-height:140px;
                            background:var(--bg);
                            border:1px solid var(--border);
                            border-radius:8px;
                            padding:13px;
                            color:white;
                            resize:vertical;
                        "
                        placeholder="Write your answer here..."
                    ></textarea>

                    <div class="slide-actions">

                        <button class="primary-btn" id="saveAnswer">
                            Save Answer
                        </button>

                        <button id="deleteQuestion">
                            Delete Question
                        </button>

                    </div>

                </div>

                <div class="slide-actions">

                    <button id="backToFolder">
                        ← Back to Folder
                    </button>

                </div>

            </div>

        `;

        // Set textarea value safely
        document.getElementById("answerInput").value = answer;

        // Highlight Markdown code
        highlightCode();


        // SAVE ANSWER
        document.getElementById("saveAnswer")
            .addEventListener("click", async () => {

                const newAnswer = document.getElementById("answerInput")
                    .value.trim();

                if (!newAnswer) {

                    alert("Please enter an answer.");
                    return;

                }

                try {

                    await apiRequest(`/updateFile/${questionId}`, {

                        method: "PUT",

                        body: JSON.stringify({
                            answer: newAnswer
                        })

                    });

                    alert("Answer updated successfully!");

                    await openQuestion(questionId);

                } catch (error) {

                    showError(error);

                }

            });


        // DELETE QUESTION
        document.getElementById("deleteQuestion")
            .addEventListener("click", async () => {

                if (!confirm("Delete this question permanently?")) {
                    return;
                }

                try {

                    await apiRequest(`/deleteFile/${questionId}`, {

                        method: "DELETE"

                    });

                    questions = questions.filter(
                        item => getQuestionId(item) !== questionId
                    );

                    alert("Question deleted successfully!");

                    if (folderId) {

                        openFolder(folderId);

                    } else {

                        renderDashboard();

                    }

                } catch (error) {

                    showError(error);

                }

            });


        // BACK TO FOLDER
        document.getElementById("backToFolder")
            .addEventListener("click", () => {

                if (folderId) {

                    openFolder(folderId);

                } else {

                    renderDashboard();

                }

            });

    } catch (error) {

        showError(error);

    }

}


// =========================================
// ALL QUESTIONS
// =========================================

async function renderAllQuestions() {

    currentPage = "all";
    currentFolderId = null;
    currentQuestionId = null;

    pageTitle.textContent = "All Questions";

    try {

        await loadAllData();

        mainContent.innerHTML = `

            <div class="welcome-section">

                <h1>All Questions</h1>

                <p>
                    Manage all your saved questions in one place.
                </p>

            </div>

            <div class="question-grid" id="allQuestionGrid"></div>

        `;

        const grid = document.getElementById("allQuestionGrid");

        if (!questions.length) {

            grid.innerHTML = `
                <p class="muted">No questions saved yet.</p>
            `;

            return;

        }

        questions.forEach(question => {

            grid.appendChild(createQuestionCard(question));

        });

    } catch (error) {

        showError(error);

    }

}


// =========================================
// FAVORITES
// =========================================

async function renderFavorites() {

    currentPage = "favorites";
    currentFolderId = null;
    currentQuestionId = null;

    pageTitle.textContent = "Favorites";

    mainContent.innerHTML = `

        <div class="welcome-section">

            <h1>Favorite Questions</h1>

            <p>
                Favorite functionality needs a backend API and
                a favorite field in your File model.
            </p>

        </div>

        <p class="muted">
            Favorites are not connected yet.
        </p>

    `;

    renderFolders();

}


// =========================================
// NAVIGATION
// =========================================

document.querySelectorAll(".nav-link").forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        document.querySelectorAll(".nav-link").forEach(item => {

            item.classList.remove("active");

        });

        link.classList.add("active");

        const page = link.dataset.page;

        if (page === "dashboard") {
            renderDashboard();
        }

        if (page === "all") {
            renderAllQuestions();
        }

        if (page === "favorites") {
            renderFavorites();
        }

        closeMobileSidebar();

    });

});


// =========================================
// MOBILE SIDEBAR
// =========================================

const sidebar = document.getElementById("sidebar");

const menuToggle = document.getElementById("menuToggle");

const closeSidebar = document.getElementById("closeSidebar");

const overlay = document.getElementById("sidebarOverlay");


function openMobileSidebar() {

    sidebar.classList.add("open");

    overlay.classList.add("show");

    menuToggle.classList.add("active");

}


function closeMobileSidebar() {

    sidebar.classList.remove("open");

    overlay.classList.remove("show");

    menuToggle.classList.remove("active");

}


menuToggle.addEventListener("click", () => {

    sidebar.classList.contains("open")
        ? closeMobileSidebar()
        : openMobileSidebar();

});


closeSidebar.addEventListener("click", closeMobileSidebar);

overlay.addEventListener("click", closeMobileSidebar);


// =========================================
// KEYBOARD & WINDOW EVENTS
// =========================================

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        closeMobileSidebar();

        closeModal("folderModal");

    }

});


window.addEventListener("resize", () => {

    if (window.innerWidth > 768) {

        closeMobileSidebar();

    }

});


// =========================================
// INITIALIZE APP
// =========================================

async function initializeApp() {

    mainContent.innerHTML = `

        <div class="empty-state">

            <h3>Loading AI Workspace...</h3>

        </div>

    `;

    await renderDashboard();

}

initializeApp();
