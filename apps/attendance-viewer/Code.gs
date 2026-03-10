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
    
    // We only want Columns C, D, E, H, I, J, K, L, M, N, O, P, Q, R, S
    // 0-indexed column mapping
    // C=2, D=3, E=4, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18
    const requiredColIndices = [2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const maxIndex = 18; // S is the farthest column

    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({success: true, headers: [], rows: []}))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // Fetch from column A to S (1 to 19 in 1-indexed range)
    const dataRange = sheet.getRange(1, 1, lastRow, maxIndex + 1);
    const data = dataRange.getDisplayValues();

    // Filter the rows to extract only the specified columns
    const filteredData = data.map(row => requiredColIndices.map(i => row[i] || ""));

    const headers = filteredData[0];
    const rows = filteredData.slice(1);

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
