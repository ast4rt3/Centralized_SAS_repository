// ==========================================
// FOUNDATION DAY ATTENDANCE - SECURE BACKEND
// ==========================================
// INSTRUCTIONS:
// 1. Go to script.google.com and create a New Project.
// 2. Paste this entire code into Code.gs (replacing everything there).
// 3. Name it "Attendance Viewer API" or similar.
// 4. Click "Deploy" > "New Deployment".
// 5. Setup: Select type "Web App".
//    - Execute as: "Me"
//    - Who has access: "Anyone" (Must be Anyone!)
// 6. Copy the "Web App URL" it gives you.
// 7. Paste that URL into 'apps/attendance-viewer/app.js' assigned to the GAS_URL variable.
// ==========================================

const masterlistID = "1ROXUAlBt1bYx4ftNqG-HBwH2GzCyH9bix2pilzEMDEs";

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(masterlistID);
    const sheet = ss.getSheetByName("Master List"); 
    
    // We only want Columns C through S. (Col C is index 3, S is index 19)
    // 19 - 3 + 1 = 17 columns total
    const lastRow = sheet.getLastRow();
    
    // If sheet is empty except headers
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({success: true, headers: [], rows: []}))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    const dataRange = sheet.getRange(1, 3, lastRow, 17);
    const data = dataRange.getDisplayValues(); // getDisplayValues formats dates nicely

    const headers = data[0];
    const rows = data.slice(1);

    return ContentService.createTextOutput(JSON.stringify({
      success: true, 
      headers: headers, 
      rows: rows
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: "Error fetching Masterlist: " + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
