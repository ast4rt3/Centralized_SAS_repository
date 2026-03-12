// ==============================================================
// NBSC SAS REPOSITORY BACKEND
// All features: Login, Posts CRUD, TV Visibility, TV Settings,
//               Google Drive File Uploads
// ==============================================================

const masterDatabaseID = "1PJ21kipAuQ_a0GzSkG8r9UFDRdCEDXwytIu7SZWm7cs";
const DRIVE_FOLDER_ID = "1WJ9pa_ZcDWEz-t2MssgLE1gUB-kMZOyv"; // SAS_TV_Uploads (personal account)

// --------------------------------------------------------------
// doGet — Fetch all posts + global TV settings
// --------------------------------------------------------------
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(masterDatabaseID);
    const sheet = ss.getSheetByName("Posts");

    if (!sheet) return respondJSON({ success: true, posts: [] });

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return respondJSON({ success: true, posts: [] });

    const data = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();

    const posts = data.map(row => ({
      timestamp:     row[0] || new Date().toISOString(),
      title:         row[1] || "",
      description:   row[2] || "",
      imageUrl:      row[3] || "",
      imagePosition: row[4] || "center",
      imageSize:     row[5] || "cover",
      showOnTv:      row[6] === "" ? "true" : row[6].toLowerCase()
    }));

    posts.reverse(); // Newest first

    const props = PropertiesService.getScriptProperties();
    const tvSettings = {
      tvAudioEnabled:   props.getProperty("tvAudio")   === "true",
      tvTheaterEnabled: props.getProperty("tvTheater") === "true"
    };

    return respondJSON({ success: true, posts: posts, tvSettings: tvSettings });

  } catch (err) {
    return respondJSON({ success: false, message: "Error reading data: " + err.message });
  }
}

// --------------------------------------------------------------
// doPost — Route incoming actions
// --------------------------------------------------------------
function doPost(e) {
  try {
    let payload = {};

    if (e.parameter && Object.keys(e.parameter).length > 0) {
      payload = e.parameter;
    }

    if (e.postData && e.postData.contents) {
      if (e.postData.type === "application/json" || e.postData.contents.startsWith("{")) {
        try { payload = Object.assign(payload, JSON.parse(e.postData.contents)); } catch (_) {}
      } else {
        // x-www-form-urlencoded fallback
        e.postData.contents.split("&").forEach(p => {
          const parts = p.split("=");
          if (parts.length === 2) {
            payload[decodeURIComponent(parts[0].replace(/\+/g, " "))] =
              decodeURIComponent(parts[1].replace(/\+/g, " "));
          }
        });
      }
    }

    switch (payload.action) {
      case "login":            return handleLogin(payload.username, payload.password);
      case "addPost":          return handleAddPost(payload);
      case "editPost":         return handleEditPost(payload);
      case "deletePost":       return handleDeletePost(payload);
      case "toggleTvVisible":  return handleToggleTvVisible(payload);
      case "updateTvSettings": return handleUpdateTvSettings(payload);
      default:
        return respondJSON({ success: false, message: "Unknown action: " + payload.action });
    }

  } catch (err) {
    return respondJSON({ success: false, message: "Server Error: " + err.message });
  }
}

// --------------------------------------------------------------
// Authentication
// --------------------------------------------------------------
function handleLogin(username, password) {
  if (!username || !password) {
    return respondJSON({ success: false, message: "Username and Password required." });
  }

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Users");
  if (!sheet) return respondJSON({ success: false, message: "Users database not initialized." });

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respondJSON({ success: false, message: "Invalid credentials." });

  const users = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();

  for (const row of users) {
    if (row[0].trim() === username && row[1].trim() === password) {
      return respondJSON({
        success: true,
        username: row[0].trim(),
        role: (row[2].trim().toLowerCase() || "user")
      });
    }
  }

  return respondJSON({ success: false, message: "Invalid credentials." });
}

function verifyAdmin(payload) {
  const auth = JSON.parse(handleLogin(payload.username, payload.password).getContent());
  if (!auth.success) throw new Error("Unauthorized: Invalid credentials.");
  if (auth.role !== "admin") throw new Error("Unauthorized: Admin role required.");
}

// --------------------------------------------------------------
// Add Post
// --------------------------------------------------------------
function handleAddPost(payload) {
  try { verifyAdmin(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  let imageUrl = payload.imageUrl || "";

  if (payload.fileData && payload.fileName) {
    imageUrl = uploadFileToDrive(payload);
  }

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  sheet.appendRow([
    new Date().toLocaleString(),
    payload.title        || "Untitled Post",
    payload.description  || "",
    imageUrl,
    payload.imagePosition || "center",
    payload.imageSize     || "cover",
    "true"
  ]);

  return respondJSON({ success: true, message: "Post added successfully!" });
}

// --------------------------------------------------------------
// Edit Post
// --------------------------------------------------------------
function handleEditPost(payload) {
  try { verifyAdmin(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  if (!payload.timestamp) return respondJSON({ success: false, message: "Missing timestamp." });

  let imageUrl = payload.imageUrl || "";

  if (payload.fileData && payload.fileName) {
    imageUrl = uploadFileToDrive(payload);
  }

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  const rowIndex = findRowByTimestamp(sheet, payload.timestamp);
  if (rowIndex === -1) return respondJSON({ success: false, message: "Post not found." });

  const currentShowOnTv = sheet.getRange(rowIndex, 7).getDisplayValue() || "true";

  sheet.getRange(rowIndex, 1, 1, 7).setValues([[
    payload.timestamp,
    payload.title         || "Untitled Post",
    payload.description   || "",
    imageUrl,
    payload.imagePosition || "center",
    payload.imageSize     || "cover",
    currentShowOnTv
  ]]);

  return respondJSON({ success: true, message: "Post updated successfully!" });
}

// --------------------------------------------------------------
// Delete Post
// --------------------------------------------------------------
function handleDeletePost(payload) {
  try { verifyAdmin(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  if (!payload.timestamp) return respondJSON({ success: false, message: "Missing timestamp." });

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  const rowIndex = findRowByTimestamp(sheet, payload.timestamp);
  if (rowIndex === -1) return respondJSON({ success: false, message: "Post not found." });

  sheet.deleteRow(rowIndex);
  return respondJSON({ success: true, message: "Post deleted successfully!" });
}

// --------------------------------------------------------------
// Toggle TV Visibility
// --------------------------------------------------------------
function handleToggleTvVisible(payload) {
  try { verifyAdmin(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  if (!payload.timestamp) return respondJSON({ success: false, message: "Missing timestamp." });

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  const rowIndex = findRowByTimestamp(sheet, payload.timestamp);
  if (rowIndex === -1) return respondJSON({ success: false, message: "Post not found." });

  const cell = sheet.getRange(rowIndex, 7);
  const newVal = cell.getDisplayValue().toLowerCase() === "false" ? "true" : "false";
  cell.setValue(newVal);

  return respondJSON({ success: true, message: "TV visibility toggled to " + newVal, newState: newVal });
}

// --------------------------------------------------------------
// Update Global TV Settings
// --------------------------------------------------------------
function handleUpdateTvSettings(payload) {
  try { verifyAdmin(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  const props = PropertiesService.getScriptProperties();
  props.setProperty("tvAudio",   String(payload.tvAudioEnabled)   === "true" ? "true" : "false");
  props.setProperty("tvTheater", String(payload.tvTheaterEnabled) === "true" ? "true" : "false");

  return respondJSON({ success: true, message: "TV defaults updated." });
}

// --------------------------------------------------------------
// Upload file to Google Drive, return public view URL
// --------------------------------------------------------------
function uploadFileToDrive(payload) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.fileData),
    payload.mimeType,
    payload.fileName
  );
  const file = folder.createFile(blob);

  // Set to fully public (not just "anyone with link") so CDN links work without auth
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  // Use Drive's thumbnail CDN — works in external <img> tags without login redirects
  return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600";
}



// --------------------------------------------------------------
// ONE-TIME SETUP: Run this once in the Apps Script Editor to
// grant Drive permissions. Select "authorizeDrive" in the
// function dropdown and click Run ▶. Accept all permission pop-ups.
// --------------------------------------------------------------
function authorizeDrive() {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  Logger.log("Drive OK! Folder: " + folder.getName());
}

// --------------------------------------------------------------
// Utilities
// --------------------------------------------------------------
function findRowByTimestamp(sheet, timestamp) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i][0] === timestamp) return i + 2;
  }
  return -1;
}

function respondJSON(dataObject) {
  return ContentService
    .createTextOutput(JSON.stringify(dataObject))
    .setMimeType(ContentService.MimeType.JSON);
}
