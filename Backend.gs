// NBSC SAS REPOSITORY BACKEND
// All features: Login, Posts CRUD, TV Visibility, TV Settings,
//               Media uploads via Cloudinary
// ==============================================================

const masterDatabaseID = "1PJ21kipAuQ_a0GzSkG8r9UFDRdCEDXwytIu7SZWm7cs";
// Drive uploads are now handled by Cloudinary in the frontend for better reliability.

// --- CLOUDINARY ADMIN CONFIG (For Deletion) ---
const CLOUDINARY_CLOUD_NAME = "dj8ugtlrl";
const CLOUDINARY_API_KEY    = "317748295364596"; // Paste your API Key here
const CLOUDINARY_API_SECRET = "joU83X6PhU-gltP-USzsYqperzM"; // Paste your API Secret here

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

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getDisplayValues();

    const posts = data.map(row => ({
      timestamp:     row[0] || new Date().toISOString(),
      title:         row[1] || "",
      description:   row[2] || "",
      imageUrl:      row[3] || "",
      imagePosition: row[4] || "center",
      imageSize:     row[5] || "cover",
      showOnTv:      row[6] === "" ? "true" : row[6].toLowerCase(),
      publicId:      row[7] || ""
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
        try { payload = Object.assign(payload, JSON.parse(e.postData.contents)); } catch (e) {}
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
      case "uploadToDrive":    return respondJSON(uploadToDrive(payload.fileData, payload.fileName));
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

// Helper to verify if the user is authorized for post management (admin or uploader)
function verifyAuthorized(payload) {
  const auth = JSON.parse(handleLogin(payload.username, payload.password).getContent());
  if (!auth.success) throw new Error("Unauthorized: " + (auth.message || "Invalid credentials."));
  if (auth.role !== "admin" && auth.role !== "uploader") {
    throw new Error("Unauthorized: You do not have permission to manage posts.");
  }
  return auth;
}

// Helper to verify if user is a full Admin (required for TV settings)
function verifyAdminOnly(payload) {
  const auth = JSON.parse(handleLogin(payload.username, payload.password).getContent());
  if (!auth.success) throw new Error("Unauthorized: " + (auth.message || "Invalid credentials."));
  if (auth.role !== "admin") {
    throw new Error("Unauthorized: Admin role required for this action.");
  }
  return auth;
}

// --------------------------------------------------------------
// Add Post
// --------------------------------------------------------------
function handleAddPost(payload) {
  try { verifyAuthorized(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  const imageUrl = payload.imageUrl || "";

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  sheet.appendRow([
    new Date().toLocaleString(),
    payload.title        || "Untitled Post",
    payload.description  || "",
    payload.imageUrl || "",
    payload.imagePosition || "center",
    payload.imageSize     || "cover",
    "true",
    payload.cloudinaryPublicId || "" // Column 8: Public ID for deletion
  ]);

  return respondJSON({ success: true, message: "Post added successfully!" });
}

// --------------------------------------------------------------
// Edit Post
// --------------------------------------------------------------
function handleEditPost(payload) {
  try { verifyAuthorized(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  if (!payload.timestamp) return respondJSON({ success: false, message: "Missing timestamp." });

  const imageUrl = payload.imageUrl || "";

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  const rowIndex = findRowByTimestamp(sheet, payload.timestamp);
  if (rowIndex === -1) return respondJSON({ success: false, message: "Post not found." });

  const currentShowOnTv = sheet.getRange(rowIndex, 7).getDisplayValue() || "true";
  const existingPublicId = sheet.getRange(rowIndex, 8).getValue() || "";

  sheet.getRange(rowIndex, 1, 1, 8).setValues([[
    payload.timestamp,
    payload.title         || "Untitled Post",
    payload.description   || "",
    imageUrl,
    payload.imagePosition || "center",
    payload.imageSize     || "cover",
    currentShowOnTv,
    payload.cloudinaryPublicId || existingPublicId
  ]]);

  return respondJSON({ success: true, message: "Post updated successfully!" });
}

// --------------------------------------------------------------
// Delete Post
// --------------------------------------------------------------
function handleDeletePost(payload) {
  try { verifyAuthorized(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  if (!payload.timestamp) return respondJSON({ success: false, message: "Missing timestamp." });

  const sheet = SpreadsheetApp.openById(masterDatabaseID).getSheetByName("Posts");
  if (!sheet) return respondJSON({ success: false, message: "Posts database not initialized." });

  const rowIndex = findRowByTimestamp(sheet, payload.timestamp);
  if (rowIndex === -1) return respondJSON({ success: false, message: "Post not found." });

  // --- AUTOMATIC CLOUDINARY CLEANUP ---
  const publicId = sheet.getRange(rowIndex, 8).getValue();
  const imageUrl = sheet.getRange(rowIndex, 4).getValue() || "";
  let cloudMsg = "";
  
  if (publicId && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    try {
      const resourceType = imageUrl.includes("/video/") ? "video" : "image";
      const res = deleteFromCloudinary(publicId, resourceType);
      const resData = JSON.parse(res.getContentText());
      if (resData.result === "ok") {
        cloudMsg = " (Cloudinary asset deleted)";
      } else {
        cloudMsg = " (Cloudinary Error: " + (resData.error ? resData.error.message : resData.result) + ")";
      }
    } catch (err) {
      cloudMsg = " (Cloudinary script error: " + err.message + ")";
    }
  } else {
    if (!publicId) cloudMsg = " (Cloudinary Skip: No public_id found in row)";
    else cloudMsg = " (Cloudinary Skip: API keys missing in Backend.gs)";
  }

  sheet.deleteRow(rowIndex);
  return respondJSON({ success: true, message: "Post deleted successfully!" + cloudMsg });
}

// --------------------------------------------------------------
// Toggle TV Visibility
// --------------------------------------------------------------
function handleToggleTvVisible(payload) {
  try { verifyAuthorized(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

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
  try { verifyAdminOnly(payload); } catch (e) { return respondJSON({ success: false, message: e.message }); }

  const props = PropertiesService.getScriptProperties();
  props.setProperty("tvAudio",   String(payload.tvAudioEnabled)   === "true" ? "true" : "false");
  props.setProperty("tvTheater", String(payload.tvTheaterEnabled) === "true" ? "true" : "false");

  return respondJSON({ success: true, message: "TV defaults updated." });
}

// --------------------------------------------------------------
// TRIGGER AUTHORIZATION
// (No longer needed for uploads, but useful for Spreadsheet access)
// --------------------------------------------------------------
function triggerAuthorization() {
  const ssName = SpreadsheetApp.openById(masterDatabaseID).getName();
  Logger.log("Authorization Successful for: " + ssName);
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


// --------------------------------------------------------------
// Cloudinary Authenticated Deletion
// --------------------------------------------------------------
function deleteFromCloudinary(publicId, resourceType) {
  const type = resourceType || "image";
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Cloudinary signature for Upload API 'destroy' must be SHA-1 of params sorted alphabetically + secret (no HMAC)
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, signatureString);
  
  let signature = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte += 256;
    let hex = byte.toString(16);
    if (hex.length === 1) hex = "0" + hex;
    signature += hex;
  }

  const formData = {
    public_id: publicId,
    timestamp: timestamp,
    api_key: CLOUDINARY_API_KEY,
    signature: signature
  };

  const options = {
    method: "post",
    payload: formData,
    muteHttpExceptions: true
  };

  // URL depends on resource type: image/destroy, video/destroy, etc.
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/destroy`;
  const response = UrlFetchApp.fetch(url, options);
  Logger.log(`Cloudinary ${type} Deletion Response: ` + response.getContentText());
  return response;
}


function respondJSON(dataObject) {
  return ContentService
    .createTextOutput(JSON.stringify(dataObject))
    .setMimeType(ContentService.MimeType.JSON);
}
// --------------------------------------------------------------
// TEST FUNCTION: Run this in the Apps Script editor to check keys
// --------------------------------------------------------------
function testCloudinaryAuth() {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
    Logger.log("❌ ERROR: Missing Cloudinary credentials in Backend.gs!");
    return;
  }
  
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signatureString = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, signatureString);
  let signature = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte += 256;
    let hex = byte.toString(16);
    if (hex.length === 1) hex = "0" + hex;
    signature += hex;
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/ping?api_key=${CLOUDINARY_API_KEY}&signature=${signature}&timestamp=${timestamp}`;
  
  try {
    const res = UrlFetchApp.fetch(url);
    Logger.log("✅ Cloudinary Auth Success! Result: " + res.getContentText());
  } catch (e) {
    Logger.log("❌ Cloudinary Auth Failed! Error: " + e.message);
  }
}

// --------------------------------------------------------------
// Google Drive Upload (For Large Media > 90MB)
// --------------------------------------------------------------
function uploadToDrive(base64Data, fileName) {
  try {
    if (!base64Data) return { success: false, message: "No file data received." };
    
    // Decode Base64 string to blob
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, null, fileName || ("upload_" + new Date().getTime()));
    
    // Create file in root (or specify a folder ID)
    const file = DriveApp.createFile(blob);
    
    // Set sharing so anybody with the link can view (important for TV display)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { 
      success: true, 
      url: file.getUrl().replace("/view?usp=drivesdk", "/preview"), // Better for iframes
      message: "Uploaded to Google Drive successfully!" 
    };
  } catch (err) {
    return { success: false, message: "Drive Upload Error: " + err.toString() };
  }
}
