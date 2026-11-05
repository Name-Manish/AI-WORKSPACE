
const API_URL = "http://localhost:5000/api/users/";

// ELEMENTS
const SidebarLoginButton = document.getElementById("sidebar-LogIn");
const LoginAndRegisterForm = document.getElementById("LoginAndRegister");
const LoginFirst = document.getElementById("LoginFirst");

const authOverlay = document.getElementById("authOverlay");
const closeAuth = document.getElementById("closeAuth");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");


// OPEN AUTH PANEL
function openAuth() {
    LoginAndRegisterForm.classList.add("active");
    authOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
    Get_Auth_profile();
}

// CLOSE AUTH PANEL
function closeAuthPanel() {
    LoginAndRegisterForm.classList.remove("active");
    authOverlay.classList.remove("active");
    document.body.style.overflow = "";
}


// SIDEBAR CLICK
SidebarLoginButton?.addEventListener("click", openAuth);

// THREE DOTS CLICK
LoginFirst?.addEventListener("click", (event) => {
    event.stopPropagation();
    openAuth();
});

// CLOSE BUTTON
closeAuth.addEventListener("click", closeAuthPanel);

// OUTSIDE CLICK
authOverlay.addEventListener("click", closeAuthPanel);

// ESCAPE KEY
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeAuthPanel();
    }
});


// SWITCH LOGIN
function showLogin() {
    loginForm.hidden = false;
    registerForm.hidden = true;

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    document.getElementById("authTitle").textContent = "Welcome Back!";
    document.getElementById("authSubtitle").textContent =
        "Login to continue to your workspace.";
}

// SWITCH REGISTER
function showRegister() {
    loginForm.hidden = true;
    registerForm.hidden = false;

    registerTab.classList.add("active");
    loginTab.classList.remove("active");

    document.getElementById("authTitle").textContent = "Create Account";
    document.getElementById("authSubtitle").textContent =
        "Create your account and start learning.";
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);


// PASSWORD SHOW / HIDE
document.querySelectorAll(".password-toggle").forEach(button => {

    button.addEventListener("click", () => {

        const input = document.getElementById(button.dataset.target);

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
        } else {
            input.type = "password";
            button.textContent = "Show";
        }

    });

});


// SHOW MESSAGE
function showMessage(id, message, type = "error") {

    const element = document.getElementById(id);

    element.textContent = message;
    element.className = `auth-message ${type}`;
}


// SAVE USER DATA
function saveUserData(result, email) {

    const token =
        result.token ||
        result.accessToken ||
        result.data?.token;

    const user =
        result.user ||
        result.data?.user ||
        result.data ||
        {};

    if (token) {
        localStorage.setItem("token", token);
    }

    const userData = {
        name: user.name || "My Account",
        email: user.email || email
    };

    localStorage.setItem("user", JSON.stringify(userData));

    const nameElement = document.querySelector(".user-details h4");
    const statusElement = document.querySelector(".user-details p");
    const avatar = document.querySelector(".user-avatar");

    if (nameElement) nameElement.textContent = userData.name;
    if (statusElement) statusElement.textContent = userData.email;
    if (avatar) avatar.textContent = userData.name.charAt(0).toUpperCase();
}


// LOGIN API
async function UserLogin(email, password) {

    const response = await fetch(`${API_URL}login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || result.error || "Login failed");
    }

    saveUserData(result, email);

    return result;
}


// REGISTER API
async function UserRegister(name, email, password) {

    const response = await fetch(`${API_URL}register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ name, email, password })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || result.error || "Registration failed");
    }

    return result;
}


// LOGIN FORM SUBMIT
loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const submitButton = document.getElementById("loginSubmit");

    try {

        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";

        showMessage("loginMessage", "");

        await UserLogin(email, password);

        showMessage("loginMessage", "Login successful!", "success");

        loginForm.reset();

        setTimeout(closeAuthPanel, 1000);

    } catch (error) {

        showMessage("loginMessage", error.message);

    } finally {

        submitButton.disabled = false;
        submitButton.innerHTML = 'Login to Workspace <span>→</span>';

    }

});


// REGISTER FORM SUBMIT
registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    const submitButton = document.getElementById("registerSubmit");

    try {

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        showMessage("registerMessage", "");

        await UserRegister(name, email, password);

        showMessage(
            "registerMessage",
            "Account created! Please login.",
            "success"
        );

        registerForm.reset();

        setTimeout(() => {
            showLogin();
            document.getElementById("loginEmail").value = email;
        }, 1000);

    } catch (error) {

        showMessage("registerMessage", error.message);

    } finally {

        submitButton.disabled = false;
        submitButton.innerHTML = 'Create Account <span>→</span>';

    }

});


// CHECK EXISTING USER
function checkExistingUser() {

    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    try {

        const user = JSON.parse(savedUser);

        const nameElement = document.querySelector(".user-details h4");
        const statusElement = document.querySelector(".user-details p");
        const avatar = document.querySelector(".user-avatar");

        if (nameElement) nameElement.textContent = user.name;
        if (statusElement) statusElement.textContent = user.email;
        if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

    } catch (error) {
        console.error(error);
    }

}

checkExistingUser();





//Profile edition here

const AuthProfile = document.getElementById("AuthProfile");
const ProfileAccessModeOn = document.getElementById("ProfileAccessModeOn")
async function LogoutNow() {
    const response = await fetch(`${API_URL}logout`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    });
    const result = await response.json();
    console.log(result);
    closeAuthPanel()
    location.reload()
}





async function Get_Auth_profile(){
    const response = await fetch(`${API_URL}profile`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    });
    const result = await response.json();
    if(result.success===true){
        const str1 = result.user.name;
        AuthProfile.style.display="flex"
        ProfileAccessModeOn.style.display="none"
        loginForm.style.display="none"
        document.getElementById("authHeading").style.display="none";
        document.getElementById("profileAvatar").innerText=str1[0];
        document.getElementById("profileName").innerText=result.user.name;
        document.getElementById("profileEmail").innerText=result.user.email;
        document.getElementById("detailName").innerText=result.user.name;
        document.getElementById("detailEmail").innerText=result.user.email;

        console.log(str1[0]);
    }
}

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click",LogoutNow)