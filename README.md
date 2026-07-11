# 🌟 Expense Tracker — Modern Personal Finance & Budgeting Suite

<p align="center">
  <img src="static/images/logo.png" alt="Expense Tracker Logo" width="120px" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.15);"/>
</p>

**Expense Tracker** is a premium, beautifully designed personal finance space built to help users manage their daily spending with zero friction. Inspired by sleek, modern fintech applications, this project is built to deliver a highly interactive, responsive, and luxurious financial management experience.

---

## 👨‍💻 Created By
*   **Jagadeesh Veeranki**

---

## 🎨 Core Features

*   **📱 Full Responsive Design & Mobile Drawer:** Scales and adapts to all viewports—including iPhones, Android devices, iPads, tablets, MacBooks, and large desktop monitors. On mobile, the navigation sidebar collapses into a sliding menu with a frosted glass backdrop overlay.
*   **🏦 Multi-Account Bank Switcher:** Supports up to 5 concurrent active logins. Users can add and manage multiple bank accounts inside the same app instance and switch between them instantly in a single click from the user dropdown.
*   **📸 Device Image Upload & Custom Avatars:** Fully customizable Settings page allowing users to upload their own profile pictures directly from their device explorer (supports PNG, JPG, JPEG, SVG, GIF up to 2MB) or pick one of the modern vector presets.
*   **🔒 Secure Sign-In & Anti-Bot Protection:** Features session-based rate-limiting (5 attempts with a temporary 30-second lockout) and a math captcha validation to defend against brute-force attacks and automated scripts.
*   **💡 Elegant Dashboard & Live Alerts:** View all-time transactions, monthly spending habits, and daily averages inside custom glassmorphic cards. Tracks and warns users instantly with live alert badges if a category budget is overrun.
*   **📊 Adaptive Financial Charts:** Beautiful doughnut and line charts showing where money is going, complete with dynamic resizing for short mobile screens.
*   **📦 Data Exports:** Export financial records instantly to fully-formatted Excel sheets (`.xlsx`), standard CSV files, or print-ready PDF summaries.

---

## 🛠️ The Tech Stack

This suite is built to be lightweight, secure, and fast:
*   **Backend:** Python 3.x, Flask, Flask-SQLAlchemy, Flask-Login, and Flask-Bcrypt (for password hashing).
*   **Frontend:** HTML5, CSS3 Custom Variables, Bootstrap 5.3+, and Chart.js 4.x.
*   **Database:** SQLite (self-healing database structures, no complex database setup needed).
*   **Reports:** Built with openpyxl and fpdf2.

---

## 🚀 Complete Installation & Run Guide (All OS)

Follow these step-by-step commands to clone, compile, and run the Expense Tracker application on any operating system:

### 1. Prerequisites
Make sure you have **Python 3.8 or higher** and **Git** installed on your system.

---

### Step 2: Clone the Repository
Open your terminal (PowerShell, Command Prompt, or terminal emulator) and run:
```bash
git clone https://github.com/jagadeeshveeranki36/Expense-Tracker.git
cd Expense-Tracker
```

---

### Step 3: Initialize & Activate Virtual Environment

**💻 On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**💻 On Windows (Command Prompt - CMD):**
```cmd
python -m venv venv
call venv\Scripts\activate.bat
```

**🍎 / 🐧 On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### Step 4: Install Dependencies
With the virtual environment active, compile and install all required packages:
```bash
pip install -r requirements.txt
```

---

### Step 5: Configure Environment Variables
Copy the `.env.example` file to create your local active `.env` configuration file:

**💻 On Windows (PowerShell / CMD):**
```powershell
copy .env.example .env
```

**🍎 / 🐧 On macOS / Linux:**
```bash
cp .env.example .env
```
*(Optional: Open `.env` in any editor to customize your `SECRET_KEY` and configuration variables).*

---

### Step 6: Launch the Application
Start the Flask development server. On your very first run, the self-healing database layer will automatically compile the SQLite database structures and tables:

**💻 On Windows (PowerShell / CMD):**
```bash
python app.py
```

**🍎 / 🐧 On macOS / Linux:**
```bash
python3 app.py
```
Open your browser and navigate to: **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)** 🎉

---

### Step 7: Run Automated Testing Suites
To verify database relationships, secure forms, and switcher endpoints are working correctly:

**💻 On Windows (PowerShell / CMD):**
```bash
python tests/verify_app.py
python tests/verify_multi_account.py
```

**🍎 / 🐧 On macOS / Linux:**
```bash
python3 tests/verify_app.py
python3 tests/verify_multi_account.py
```
*(Verify that both test commands return an `OK` result)*

---

## 🐳 Running with Docker

You can also run the entire suite using Docker and Docker Compose:

```bash
# Build and start services in the background
docker-compose up --build -d

# Check service status
docker-compose ps

# Tear down the services
docker-compose down
```
Once launched, the containerized application will be live at `http://localhost:5000/`.

---

## 🌐 Deploying to GitHub Pages (Static SPA)

We have converted this project to support a fully client-side Single Page Application (SPA) mode utilizing `localStorage` for database state, allowing it to be hosted on static platforms like **GitHub Pages** with zero configuration!

To enable the live static website on GitHub Pages:
1. Go to your repository on GitHub: `https://github.com/jagadeeshveeranki36/Expense-Tracker`.
2. Click on the **Settings** tab.
3. In the left-hand menu, navigate to **Pages** under the "Code and automation" section.
4. Under **Build and deployment**, verify that **Source** is set to **Deploy from a branch**.
5. Set the **Branch** to `main` and select `/ (root)` folder, then click **Save**.
6. GitHub Pages will build and deploy your site in 1–2 minutes! Your application will be live at `https://jagadeeshveeranki36.github.io/Expense-Tracker/`.

