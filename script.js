
const API_URL = "http://localhost:5000/api/users";

const $ = (id) => document.getElementById(id);

const authSection = $("authSection");
const dashboard = $("dashboard");
const message = $("message");
const dashboardMessage = $("dashboardMessage");

function showMessage(element, text, type = "success") {
  element.textContent = text;
  element.className = `message ${type}`;
}

function clearMessage(element) {
  element.textContent = "";
  element.className = "message";
}

function setLoading(form, loading) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Please wait...";
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

// Common API function
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid response from server",
  }));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// Switch between login and register
function showAuthTab(tab) {
  const isLogin = tab === "login";

  $("loginForm").hidden = !isLogin;
  $("registerForm").hidden = isLogin;

  $("loginTab").classList.toggle("active", isLogin);
  $("registerTab").classList.toggle("active", !isLogin);

  clearMessage(message);
}

$("loginTab").addEventListener("click", () => {
  showAuthTab("login");
});

$("registerTab").addEventListener("click", () => {
  showAuthTab("register");
});

// Show the logged-in user's dashboard
function renderProfile(user) {
  $("profileName").textContent = user.name || "User";
  $("profileEmail").textContent = user.email || "";
  $("profileRole").textContent = user.role || "user";

  $("avatar").textContent =
    (user.name || "U").trim().charAt(0).toUpperCase();

  $("profileNameInput").value = user.name || "";
  $("profileEmailInput").value = user.email || "";
}

async function loadProfile() {
  const data = await apiRequest("/profile");

  renderProfile(data.user);

  authSection.hidden = true;
  dashboard.hidden = false;
  clearMessage(dashboardMessage);
}

// Register
$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage(message);
  setLoading(form, true);

  try {
    const payload = {
      name: $("registerName").value.trim(),
      email: $("registerEmail").value.trim(),
      password: $("registerPassword").value,
    };

    await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    form.reset();
    await loadProfile();
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    setLoading(form, false);
  }
});

// Login
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage(message);
  setLoading(form, true);

  try {
    const payload = {
      email: $("loginEmail").value.trim(),
      password: $("loginPassword").value,
    };

    await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    form.reset();
    await loadProfile();
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    setLoading(form, false);
  }
});

// Update profile
$("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage(dashboardMessage);
  setLoading(form, true);

  try {
    const payload = {
      name: $("profileNameInput").value.trim(),
      email: $("profileEmailInput").value.trim(),
    };

    const data = await apiRequest("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    renderProfile(data.user);

    showMessage(
      dashboardMessage,
      data.message || "Profile updated successfully"
    );
  } catch (error) {
    showMessage(dashboardMessage, error.message, "error");
  } finally {
    setLoading(form, false);
  }
});

// Change password
$("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage(dashboardMessage);

  const currentPassword = $("currentPassword").value;
  const newPassword = $("newPassword").value;

  if (currentPassword === newPassword) {
    showMessage(
      dashboardMessage,
      "New password must differ from current password.",
      "error"
    );
    return;
  }

  setLoading(form, true);

  try {
    const data = await apiRequest("/change-password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    form.reset();

    authSection.hidden = false;
    dashboard.hidden = true;
    showAuthTab("login");

    showMessage(
      message,
      data.message || "Password changed. Please log in again."
    );
  } catch (error) {
    showMessage(dashboardMessage, error.message, "error");
  } finally {
    setLoading(form, false);
  }
});

// Logout
$("logoutBtn").addEventListener("click", async () => {
  $("logoutBtn").disabled = true;

  try {
    await apiRequest("/logout", {
      method: "POST",
    });

    dashboard.hidden = true;
    authSection.hidden = false;
    showAuthTab("login");

    showMessage(message, "You have logged out successfully.");
  } catch (error) {
    showMessage(dashboardMessage, error.message, "error");
  } finally {
    $("logoutBtn").disabled = false;
  }
});

// Check API and restore existing session
async function init() {
  try {
    await loadProfile();
    $("apiStatus").textContent = "API connected";
  } catch (error) {
    authSection.hidden = false;
    dashboard.hidden = true;

    if (
      error.message === "Please log in first" ||
      error.message === "Invalid or expired token" ||
      error.message === "User not found or inactive"
    ) {
      $("apiStatus").textContent = "API connected";
    } else {
      $("apiStatus").textContent = "Check backend / CORS";
      showMessage(
        message,
        "Backend se connect nahi ho raha. Server aur CORS settings check karein.",
        "error"
      );
    }
  }
}

init();
