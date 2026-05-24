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

## ⚙️ Compilation, Setup & Running Steps

Follow these steps to compile, initialize, and execute the Expense Tracker application on your local machine:

### 1. Prerequisites
Make sure you have **Python 3.8 or higher** installed.

### 2. Prepare the Workspace Environment
Navigate to the root project directory in your terminal and compile a clean Python virtual environment:

**On Windows (PowerShell):**
```powershell
# Create the environment directory
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1
```

**On Linux / macOS:**
```bash
# Create the environment directory
python -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

### 3. Compile and Install Package Dependencies
Install the required packages list to compile all libraries needed for reports, database, security, and charts:
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy the `.env.example` file to create your active `.env` configuration file:

**On Windows (PowerShell):**
```powershell
copy .env.example .env
```

**On Linux / macOS:**
```bash
cp .env.example .env
```
*(Open up `.env` to configure your `SECRET_KEY` and other parameters).*

### 5. Start and Bootstrap the Application
Run the main startup script. The application uses a self-healing SQLite configuration; on the first run, it will automatically bootstrap the database and compile all tables:
```bash
python app.py
```
Open your browser and navigate to: **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)** 🎉

### 6. Run Automated Testing Suite
Validate the entire application codebase integrity, blueprints, database relationships, and account switcher structures with these commands:
```powershell
# Run core dashboard integration test suite
python tests/verify_app.py

# Run multi-account switcher session tests
python tests/verify_multi_account.py
```

---

## 🐳 Running with Docker

You can also package, compile, and run the entire suite containerized:

```bash
# Build and start container services in the background
docker-compose up --build -d

# Check service status
docker-compose ps

# Stop container services
docker-compose down
```
The containerized application will be live at `http://localhost:5000/`.
