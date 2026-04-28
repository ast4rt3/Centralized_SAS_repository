// masterlist-manager/app.js
console.log("masterlist-manager/app.js is executing!");

try {
    if (!window.ENV) {
        console.error("CRITICAL ERROR: window.ENV is undefined. env.js did not load correctly.");
        alert("Configuration Error: env.js could not be loaded.");
        throw new Error("window.ENV undefined");
    }

    if (!window.supabase) {
        console.error("CRITICAL ERROR: window.supabase is undefined. The CDN script failed to load.");
        alert("Dependency Error: Supabase client could not be loaded.");
        throw new Error("window.supabase undefined");
    }

    const supabaseUrl = window.ENV.SUPABASE_URL;
    const supabaseKey = window.ENV.SUPABASE_ANON_KEY;
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewCard = document.getElementById('previewCard');
    const fileNameEl = document.getElementById('fileName');
    const rowCountEl = document.getElementById('rowCount');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const uploadBtn = document.getElementById('uploadBtn');
    const logContainer = document.getElementById('logContainer');
    const dbToggle = document.getElementById('dbToggle');
    const modeBadge = document.getElementById('modeBadge');

    let parsedData = [];
    let fileHeaders = [];

    // --- TOGGLE LOGIC ---
    dbToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            modeBadge.textContent = "TEST MODE";
            modeBadge.className = "mode-badge badge-test";
            uploadBtn.style.background = "var(--nbsc-blue)";
            uploadBtn.innerHTML = "<i class='bx bx-cloud-upload'></i> Start Upload";
        } else {
            modeBadge.textContent = "PRODUCTION MODE";
            modeBadge.className = "mode-badge badge-prod";
            uploadBtn.style.background = "var(--error)";
            uploadBtn.innerHTML = "<i class='bx bx-error'></i> Update Production";
        }
    });

    // --- DRAG AND DROP LOGIC ---
    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            console.log("Dropzone clicked, triggering fileInput");
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        console.log("File dropped!");
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        console.log("File selected via input");
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    // --- FILE HANDLING ---
    function handleFile(file) {
        fileNameEl.textContent = file.name;
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'csv') {
            if (!window.Papa) {
                alert("Error: PapaParse library not loaded.");
                return;
            }
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.errors.length) {
                        log("Warning: There were parsing errors in the CSV.", "error");
                    }
                    processParsedData(results.data, results.meta.fields);
                }
            });
        } else if (ext === 'json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!Array.isArray(data)) throw new Error("JSON must be an array of objects.");
                    if (data.length === 0) throw new Error("JSON array is empty.");
                    const fields = Object.keys(data[0]);
                    processParsedData(data, fields);
                } catch (err) {
                    alert("Invalid JSON file: " + err.message);
                }
            };
            reader.readAsText(file);
        } else {
            alert("Unsupported file type. Please upload a CSV or JSON file.");
        }
    }

    function processParsedData(data, fields) {
        if (!data || data.length === 0) {
            alert("No valid data found in file.");
            return;
        }

        parsedData = data;
        fileHeaders = fields;
        
        // Ensure ID column exists for upsert
        const hasId = fields.some(f => f.toLowerCase() === 'id');
        if (!hasId) {
            alert("WARNING: Your dataset does not have an 'ID' column. An ID column is highly recommended as the primary key to prevent duplicate rows.");
        }

        rowCountEl.textContent = data.length;
        renderPreviewTable();
        previewCard.style.display = 'block';
        uploadBtn.disabled = false;
        logContainer.style.display = 'none';
        logContainer.innerHTML = '';
    }

    function renderPreviewTable() {
        // Clear existing
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Headers
        fileHeaders.forEach(field => {
            const th = document.createElement('th');
            th.textContent = field;
            tableHead.appendChild(th);
        });

        // Body (show max 5 rows to save memory/DOM)
        const previewLimit = Math.min(parsedData.length, 5);
        for (let i = 0; i < previewLimit; i++) {
            const rowData = parsedData[i];
            const tr = document.createElement('tr');
            
            fileHeaders.forEach(field => {
                const td = document.createElement('td');
                td.textContent = rowData[field] || '';
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        }

        if (parsedData.length > 5) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = fileHeaders.length;
            td.textContent = `... and ${parsedData.length - 5} more rows.`;
            td.style.textAlign = 'center';
            td.style.fontStyle = 'italic';
            td.style.color = 'var(--text-muted)';
            tr.appendChild(td);
            tableBody.appendChild(tr);
        }
    }

    // --- LOGGING ---
    function log(msg, type = 'info') {
        logContainer.style.display = 'block';
        const div = document.createElement('div');
        div.className = `log-${type}`;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logContainer.appendChild(div);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // --- UPLOAD ---
    uploadBtn.addEventListener('click', async () => {
        if (parsedData.length === 0) return;

        const isProd = !dbToggle.checked;
        const targetTable = isProd ? "NBSC_masterlist" : "NBSC_masterlist_test";

        if (isProd) {
            const confirmProd = confirm(`🚨 WARNING 🚨\n\nYou are about to modify the PRODUCTION masterlist (${parsedData.length} records).\nAre you absolutely sure you want to proceed?`);
            if (!confirmProd) return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Uploading...";
        
        log(`Starting bulk upload of ${parsedData.length} records to ${targetTable}...`, 'info');

        // Supabase can struggle with massive payloads. We batch into 500 rows.
        const BATCH_SIZE = 500;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
            // Strip out unneeded columns and ONLY send ID and Name
            const batch = parsedData.slice(i, i + BATCH_SIZE).map(row => {
                const idKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'id' || k.toLowerCase().trim() === 'student id');
                const nameKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'name');
                
                let finalName = '';
                
                if (nameKey && row[nameKey]) {
                    finalName = row[nameKey];
                } else {
                    // Fallback: Compile from separated name columns
                    const firstKey = Object.keys(row).find(k => {
                        const lower = k.toLowerCase().replace(/[^a-z]/g, '');
                        return lower === 'firstname' || lower === 'first';
                    });
                    const lastKey = Object.keys(row).find(k => {
                        const lower = k.toLowerCase().replace(/[^a-z]/g, '');
                        return lower === 'lastname' || lower === 'last';
                    });
                    const midKey = Object.keys(row).find(k => {
                        const lower = k.toLowerCase().replace(/[^a-z]/g, '');
                        return lower === 'middlename' || lower === 'middle' || lower === 'mi' || lower === 'middleinitial';
                    });
                    
                    if (firstKey || lastKey) {
                        const first = firstKey ? (row[firstKey] || '').trim() : '';
                        const last = lastKey ? (row[lastKey] || '').trim() : '';
                        const mid = midKey ? (row[midKey] || '').trim() : '';
                        
                        // Format as "Last Name, First Name Middle" which is standard for schools
                        if (last && first) {
                            finalName = `${last}, ${first} ${mid}`.trim();
                        } else {
                            finalName = [first, mid, last].filter(Boolean).join(' ').trim();
                        }
                    }
                }
                
                return {
                    ID: row[idKey],
                    Name: finalName
                };
            }).filter(row => row.ID && row.Name); // Ensure we don't send empty rows

            if (batch.length === 0) continue;

            log(`Uploading batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(parsedData.length/BATCH_SIZE)}...`, 'info');

            try {
                const { data, error } = await supabase
                    .from(targetTable)
                    .upsert(batch);

                if (error) {
                    log(`Batch error: ${error.message}`, 'error');
                    errorCount += batch.length;
                } else {
                    successCount += batch.length;
                }
            } catch (err) {
                log(`Exception during upload: ${err.message}`, 'error');
                errorCount += batch.length;
            }
        }

        log(`Upload complete! ✅ Successfully synced: ${successCount} | ❌ Failed: ${errorCount}`, successCount > 0 ? 'success' : 'error');
        
        uploadBtn.innerHTML = "<i class='bx bx-check'></i> Finished";
        setTimeout(() => {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = "<i class='bx bx-cloud-upload'></i> Upload Again";
        }, 3000);
    });

} catch (e) {
    console.error("Initialization error in app.js:", e);
    alert("Initialization error in Data Manager: " + e.message);
}
