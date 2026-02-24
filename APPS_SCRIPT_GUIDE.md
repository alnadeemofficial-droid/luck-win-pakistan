# Google Apps Script Setup Guide

This guide explains how to deploy the refactored Google Apps Script code and connect it to your website.

## Step 1: Create a New Google Apps Script Project

1.  Go to [script.google.com](https://script.google.com/).
2.  Click on **New Project**.
3.  Name the project (e.g., "LuckWin Backend Refactored").

## Step 2: Create Files and Copy Code

You need to create the following files in the Apps Script editor and copy the code from the `apps_script_refactored` folder provided to you.

1.  **Code.gs**:
    *   Rename the default `Code.gs` file to `Code` (if not already).
    *   Copy the content from `apps_script_refactored/Code.gs` and paste it here.

2.  **Data.gs**:
    *   Click the **+** icon next to "Files" and select **Script**.
    *   Name it `Data`.
    *   Copy the content from `apps_script_refactored/Data.gs` and paste it here.

3.  **Participants.gs**:
    *   Create a new script file named `Participants`.
    *   Copy the content from `apps_script_refactored/Participants.gs` and paste it here.

4.  **Tiers.gs**:
    *   Create a new script file named `Tiers`.
    *   Copy the content from `apps_script_refactored/Tiers.gs` and paste it here.

5.  **Announcements.gs**:
    *   Create a new script file named `Announcements`.
    *   Copy the content from `apps_script_refactored/Announcements.gs` and paste it here.

6.  **Auth.gs**:
    *   Create a new script file named `Auth`.
    *   Copy the content from `apps_script_refactored/Auth.gs` and paste it here.

7.  **Helpers.gs**:
    *   Create a new script file named `Helpers`.
    *   Copy the content from `apps_script_refactored/Helpers.gs` and paste it here.

## Step 3: Deploy as Web App

1.  Click on the blue **Deploy** button in the top right corner.
2.  Select **New deployment**.
3.  Click the **Select type** gear icon and choose **Web app**.
4.  Fill in the details:
    *   **Description**: Initial deployment (or any description).
    *   **Execute as**: **Me** (your email address).
    *   **Who has access**: **Anyone** (This is crucial for the website to access it without user login prompts).
5.  Click **Deploy**.
6.  You might be asked to **Authorize access**.
    *   Click **Review permissions**.
    *   Choose your Google account.
    *   If you see "Google hasn't verified this app", click **Advanced** -> **Go to [Project Name] (unsafe)**.
    *   Click **Allow**.
7.  Copy the **Web App URL** provided. It will look like `https://script.google.com/macros/s/.../exec`.

## Step 4: Connect to Your Website

1.  Open your website's source code.
2.  Navigate to `api/index.ts`.
3.  Find the line where `GOOGLE_SCRIPT_URL` is defined:
    ```typescript
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
    ```
4.  Replace the old URL with the **new Web App URL** you just copied.
5.  Save the file.
6.  Redeploy your website (or restart the server if running locally).

## Security Note

*   The `Who has access: Anyone` setting allows anyone with the URL to send data to your script. However, your script logic (`doPost`) controls what actions are performed.
*   The `handleLogin` function in `Auth.gs` currently uses hardcoded credentials (`admin` / `admin123`). You should update these in the Apps Script editor to something more secure or implement a better auth mechanism if needed.

## Verification

1.  Open your website.
2.  Try registering a user or logging into the admin dashboard.
3.  Check your Google Sheet to ensure data is being populated correctly.
