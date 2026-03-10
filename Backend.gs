// ==============================================================
// NBSC SAS REPOSITORY BACKEND (Users & Posts)
// ==============================================================
// 1. Create a new Google Spreadsheet named "SAS Backend Database".
// 2. Create two Sheets (tabs) named EXACTLY: "Users" and "Posts".
// 3. In the "Users" sheet, write headers in A1:C1 -> Username | Password | Role
//    (Example Row 2:  admin | admin123 | admin)
//    (Example Row 3:  student | password | user)
// 4. In the "Posts" sheet, write headers in A1:D1 -> Timestamp | Title | Description | ImageURL
// 5. Copy the Spreadsheet ID from the URL (the long string between /d/ and /edit).
// 6. Paste that ID into the masterDatabaseID variable below.
// 7. Click Deploy -> New Deployment -> Type: Web App -> Execute as: Me -> Access: Anyone.
// ==============================================================

const masterDatabaseID = "YOUR_SPREADSHEET_ID_HERE"; // <-- PASTE SPREADSHEET ID HERE

function doGet(e) {
  // doGet handles fetching the list of Posts for the Home page
  try {
    const ss = SpreadsheetApp.openById(masterDatabaseID);
    const sheet = ss.getSheetByName("Posts");
    
    // If the sheet doesn't exist yet, return empty
    if (!sheet) {
      return respondJSON({ success: true, posts: [] });
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return respondJSON({ success: true, posts: [] });
    }
    
    // Fetch all posts (A2 to F[lastRow])
    const data = sheet.getRange(2, 1, lastRow - 1, 6).getDisplayValues();
    
    // Format into an array of objects
    const posts = data.map(row => {
      return {
        timestamp: row[0] || new Date().toISOString(),
        title: row[1] || "",
        description: row[2] || "",
        imageUrl: row[3] || "",
        imagePosition: row[4] || "center",
        imageSize: row[5] || "cover"
      };
    });
    
    // Reverse so newest posts show first
    posts.reverse();
    
    return respondJSON({ success: true, posts: posts });
    
  } catch (err) {
    return respondJSON({ success: false, message: "Error reading Data: " + err.message });
  }
}

function doPost(e) {
  // doPost handles Login attempts AND Adding New Posts
  try {
    let payload = {};
    
    // Sometimes GAS auto-parses URL encoded forms into e.parameter correctly
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      payload = e.parameter;
    } 
    
    // If e.parameter is empty (common for custom POSTs), we parse the raw body string
    if (e.postData && e.postData.contents) {
      if (e.postData.type === "application/json" || e.postData.contents.startsWith("{")) {
        try {
          payload = Object.assign(payload, JSON.parse(e.postData.contents));
        } catch (e) {
          // Ignore JSON fail
        }
      } else {
        // Fallback: Manually parse x-www-form-urlencoded string
        // e.g. "action=login&username=admin&password=123"
        const params = e.postData.contents.split('&');
        for (let p of params) {
          const parts = p.split('=');
          if (parts.length === 2) {
             const key = decodeURIComponent(parts[0].replace(/\+/g, ' '));
             const val = decodeURIComponent(parts[1].replace(/\+/g, ' '));
             payload[key] = val;
          }
        }
      }
    }
    
    const action = payload.action;
    
    if (action === "login") {
      return handleLogin(payload.username, payload.password);
    } 
    else if (action === "addPost") {
      return handleAddPost(payload);
    } 
    else if (action === "editPost") {
      return handleEditPost(payload);
    }
    else if (action === "deletePost") {
      return handleDeletePost(payload);
    }
    else {
      return respondJSON({ success: false, message: "Invalid action or no payload mapped correctly. Raw body: " + (e.postData ? e.postData.contents : 'null') });
    }
    
  } catch (err) {
    return respondJSON({ success: false, message: "Server Error: " + err.message });
  }
}

function handleLogin(username, password) {
  if (!username || !password) {
    return respondJSON({ success: false, message: "Username and Password required." });
  }
  
  const ss = SpreadsheetApp.openById(masterDatabaseID);
  const sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    return respondJSON({ success: false, message: "Users database not initialized." });
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respondJSON({ success: false, message: "Invalid credentials." });
  
  // Read Usernames (Col A), Passwords (Col B), Roles (Col C)
  const users = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
  
  for (let i = 0; i < users.length; i++) {
    const dbUser = users[i][0].trim();
    const dbPass = users[i][1].trim();
    const dbRole = users[i][2].trim().toLowerCase() || "user"; // Default to 'user' if blank
    
    // Exact match (case sensitive for password)
    if (dbUser === username && dbPass === password) {
      return respondJSON({
        success: true,
        username: dbUser,
        role: dbRole
      });
    }
  }
  
  return respondJSON({ success: false, message: "Invalid credentials." });
}

function handleAddPost(payload) {
  // Very basic security: Client must pass the admin's username/pass to create a post!
  // In a real prod environment, we would use JWT tokens, but for static HTML, this acts as an API Key.
  const authResponse = handleLogin(payload.username, payload.password);
  const authObj = JSON.parse(authResponse.getContent());
  
  if (!authObj.success) {
    return respondJSON({ success: false, message: "Unauthorized: Invalid credentials." });
  }
  if (authObj.role !== "admin") {
    return respondJSON({ success: false, message: "Unauthorized: You must be an admin to post." });
  }
  
  const title = payload.title || "Untitled Post";
  const desc = payload.description || "";
  const imageUrl = payload.imageUrl || "";
  const imagePos = payload.imagePosition || "center";
  const imageSize = payload.imageSize || "cover";
  const timestamp = new Date().toLocaleString();
  
  const ss = SpreadsheetApp.openById(masterDatabaseID);
  const sheet = ss.getSheetByName("Posts");
  
  if (!sheet) {
    return respondJSON({ success: false, message: "Posts database not initialized." });
  }
  
  // Append new post as a row
  sheet.appendRow([timestamp, title, desc, imageUrl, imagePos, imageSize]);
  
  return respondJSON({ success: true, message: "Post added successfully!" });
}

function handleEditPost(payload) {
  const authResponse = handleLogin(payload.username, payload.password);
  const authObj = JSON.parse(authResponse.getContent());
  
  if (!authObj.success) {
    return respondJSON({ success: false, message: "Unauthorized: Invalid credentials." });
  }
  if (authObj.role !== "admin") {
    return respondJSON({ success: false, message: "Unauthorized: You must be an admin to edit posts." });
  }
  
  const targetTimestamp = payload.timestamp;
  if (!targetTimestamp) {
    return respondJSON({ success: false, message: "Missing timestamp for editing." });
  }

  const title = payload.title || "Untitled Post";
  const desc = payload.description || "";
  const imageUrl = payload.imageUrl || "";
  const imagePos = payload.imagePosition || "center";
  const imageSize = payload.imageSize || "cover";
  
  const ss = SpreadsheetApp.openById(masterDatabaseID);
  const sheet = ss.getSheetByName("Posts");
  
  if (!sheet) {
    return respondJSON({ success: false, message: "Posts database not initialized." });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return respondJSON({ success: false, message: "No posts found." });
  }

  const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  let rowIndex = -1;

  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i][0] === targetTimestamp) {
      rowIndex = i + 2; // +2 because range starts at row 2
      break;
    }
  }

  if (rowIndex === -1) {
    return respondJSON({ success: false, message: "Post not found." });
  }

  // Overwrite the row (keep the original timestamp)
  sheet.getRange(rowIndex, 1, 1, 6).setValues([[targetTimestamp, title, desc, imageUrl, imagePos, imageSize]]);

  return respondJSON({ success: true, message: "Post updated successfully!" });
}

function handleDeletePost(payload) {
  const authResponse = handleLogin(payload.username, payload.password);
  const authObj = JSON.parse(authResponse.getContent());
  
  if (!authObj.success) {
    return respondJSON({ success: false, message: "Unauthorized: Invalid credentials." });
  }
  if (authObj.role !== "admin") {
    return respondJSON({ success: false, message: "Unauthorized: You must be an admin to delete posts." });
  }
  
  const targetTimestamp = payload.timestamp;
  if (!targetTimestamp) {
    return respondJSON({ success: false, message: "Missing timestamp for deletion." });
  }
  
  const ss = SpreadsheetApp.openById(masterDatabaseID);
  const sheet = ss.getSheetByName("Posts");
  
  if (!sheet) {
    return respondJSON({ success: false, message: "Posts database not initialized." });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return respondJSON({ success: false, message: "No posts to delete." });
  }

  const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  let rowIndex = -1;

  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i][0] === targetTimestamp) {
      rowIndex = i + 2; // +2 because range starts at row 2
      break;
    }
  }

  if (rowIndex === -1) {
    return respondJSON({ success: false, message: "Post not found." });
  }

  // Delete the specific row
  sheet.deleteRow(rowIndex);

  return respondJSON({ success: true, message: "Post deleted successfully!" });
}

function respondJSON(dataObject) {
  return ContentService.createTextOutput(JSON.stringify(dataObject))
                       .setMimeType(ContentService.MimeType.JSON);
}
