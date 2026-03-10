// ==========================================
// NBSC MAILER - GOOGLE APPS SCRIPT BACKEND
// ==========================================
// INSTRUCTIONS:
// 1. Go to script.google.com and create a New Project.
// 2. Paste this entire code into Code.gs (replacing everything there).
// 3. Update 'masterlistID' if it's different.
// 4. Click "Deploy" > "New Deployment".
// 5. Setup: Select type "Web App".
//    - Execute as: "Me"
//    - Who has access: "Anyone"
// 6. Copy the "Web App URL" it gives you.
// 7. Paste that URL into 'apps/mailer/app.js' where it says GAS_URL.
// ==========================================

const masterlistID = "1ROXUAlBt1bYx4ftNqG-HBwH2GzCyH9bix2pilzEMDEs";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === "sendBatchEmail") {
      return ContentService.createTextOutput(JSON.stringify(sendBatchEmail(data.subject, data.body)))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "sendSingleEmail") {
      return ContentService.createTextOutput(JSON.stringify(sendSingleEmail(data.toEmail, data.subject, data.body)))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Unknown action"}))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Error parsing request"}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendSingleEmail(toEmail, subject, body) {
  try {
    GmailApp.sendEmail(toEmail, subject, "", {
      htmlBody: body,
      name: "NBSC SAS Office"
    });
    return { success: true, message: "Email sent successfully to " + toEmail, remainingQuota: MailApp.getRemainingDailyQuota() };
  } catch (err) {
    return { success: false, message: "Failed: " + err.message };
  }
}

function sendBatchEmail(subject, bodyTemplate) {
  try {
    const ss = SpreadsheetApp.openById(masterlistID);
    const sheet = ss.getSheetByName("Master List"); // Ensure this matches your tab name perfectly
    const data = sheet.getDataRange().getValues();

    const remainingQuota = MailApp.getRemainingDailyQuota();
    let processedCount = 0;
    const MAX_PER_RUN = 30; // Batches via web request should be small to avoid 30sec timeout

    for (let i = 1; i < data.length; i++) {
        if (processedCount >= MAX_PER_RUN || processedCount >= remainingQuota) break;

        let studentRow           = i + 1;
        let studentEmail         = data[i][1]  ? data[i][1].toString().trim()  : "";
        let studentName          = data[i][2]  ? data[i][2].toString().trim()  : "";
        let consentStatus        = data[i][32] ? data[i][32].toString().trim().toUpperCase() : ""; // Column AG
        
        // This is a generic batch sender condition, replicating the consent requirement
        // Modify this condition as needed for future logic!
        if (consentStatus === "YES") {
            if (!studentEmail) continue;
            
            // You can type {{NAME}} in your HTML body to personalize emails!
            let personalizedBody = bodyTemplate.replace(/\{\{NAME\}\}/g, studentName.toUpperCase());

            try {
                GmailApp.sendEmail(studentEmail, subject, "", {
                  htmlBody: personalizedBody,
                  name: "NBSC SAS Office"
                });
                
                // Keep track of what we did (e.g. Column AF/32) so you know it was batch sent
                sheet.getRange(studentRow, 32).setValue("Batch Sent (" + new Date().toLocaleString() + ")");
                processedCount++;
            } catch (err) {
                 sheet.getRange(studentRow, 32).setValue("Batch Error: " + err.message);
            }
        }
    }
    
    return { success: true, message: "Batch complete. Sent " + processedCount + " emails.", remainingQuota: MailApp.getRemainingDailyQuota() };
    
  } catch (err) {
    return { success: false, message: "Batch failed: " + err.message };
  }
}

// For CORS Preflight (Important for fetch requests from localhost/other domains)
function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
