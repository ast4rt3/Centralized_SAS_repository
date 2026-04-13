const fs = require('fs');
let content = fs.readFileSync('l:/SAS/Centralized_SAS_repository/apps/attendance-scanner/index.html', 'utf8');
const lines = content.split('\n');

const correct_code = [
    '                resultDiv.className = colorClass;',
    '                resultDiv.innerHTML =',
    '                    "<span class=\\"result-icon\\">" + icon + "</span>" +',
    '                    "<p>" + response.message + "</p>" +',
    '                    "<button class=\\"scan-btn-next\\" onclick=\\"resetScanner()\\">NEXT SCAN</button>" +',
    '                    (showFlag ?',
    '                        "<button class=\\"flag-btn\\" onclick=\\"toggleFlagBox()\\">🚩 FLAG THIS STUDENT</button>" +',
    '                        "<div id=\\"flagReasonBox\\" style=\\"display:none;background:rgba(0,0,0,0.15);border-radius:10px;padding:12px;margin-top:10px;\\">" +',
    '                        "<select id=\\"flagReasonSelect\\" style=\\"width:100%;padding:12px;border-radius:8px;border:none;font-family:Montserrat,sans-serif;margin-bottom:10px;\\">" +',
    '                        "<option value=\\"\\">— Select Reason —</option>" +',
    '                        "<option value=\\"Using someone else\'s QR\\\">Using someone else\'s Barcode</option>" +',
    '                        "<option value=\\"Suspicious behavior\\\">Suspicious behavior</option>" +',
    '                        "<option value=\\"Not the student in the QR\\\">Not the student in the Barcode</option>" +',
    '                        "<option value=\\"Already scanned elsewhere\\\">Already scanned elsewhere</option>" +',
    '                        "<option value=\\"Other\\\">Other</option>" +',
    '                        "</select>" +',
    '                        "<button onclick=\\"confirmOnlineFlag(\'" + token.replace(/\'/g, "\\\\\'") + "\')\\" style=\\"width:100%;padding:14px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:800;font-family:Montserrat,sans-serif;cursor:pointer;\\">🚩 CONFIRM FLAG</button>" +',
    '                        "</div>"',
    '                        : "");',
    '            } catch (e) {',
    '                console.error("Scanner error:", e);',
    '                const errMsg = e.message || e.toString() || "Could not reach server.";',
    '                resultDiv.className = "error";',
    '                resultDiv.innerHTML = "<span class=\\"result-icon\\">❌</span><h3>Connection Error</h3><p>" + errMsg + "</p><button class=\\"scan-btn-next\\" onclick=\\"resetScanner()\\">NEXT SCAN</button>";',
    '            }',
    '        }',
    '',
    '        // --- HELPERS ---',
    '        function getMinutesHelper(timeStr) {',
    '            if (!timeStr) return null;',
    '            const timeParts = timeStr.toString().match(/(\\d+):(\\d+)\\s*(AM|PM)?/i);',
    '            if (!timeParts) return null;',
    '            let hours = parseInt(timeParts[1]);',
    '            let minutes = parseInt(timeParts[2]);'
].join('\n');

// Replace from line 1148 to 1159
lines.splice(1148, 11, correct_code);
fs.writeFileSync('l:/SAS/Centralized_SAS_repository/apps/attendance-scanner/index.html', lines.join('\n'), 'utf8');
