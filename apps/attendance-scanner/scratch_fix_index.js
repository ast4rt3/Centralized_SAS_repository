        // --- WINDOW STATUS ---
        async function checkWindowStatus() {
            try {
                const res = await callBackend("getWindowStatus", {});
                currentWindowInfo = res;

                const bar = document.getElementById('windowStatus');
                const dot = document.getElementById('statusDot');
                const text = document.getElementById('statusText');

                if (!res) {
                    if (bar) bar.className = 'status-closed';
                    if (dot) dot.className = 'status-dot closed';
                    if (text) text.innerText = 'Connection Error';
                    return;
                }

                if (res.isOpen) {
                    bar.className = 'status-open';
                    dot.className = 'status-dot open';
                    text.innerText = 'OPEN — ' + res.type
                        + ' · ' + res.start + ' – ' + res.end
                        + ' · Col ' + res.col
                        + (res.isLate ? ' · LATE' : '');
                } else {
                    bar.className = 'status-closed';
                    dot.className = 'status-dot closed';
                    
                    if (res.nextType) {
                        text.innerText = 'UPCOMING: ' + res.nextType + ' · ' + res.nextStart + ' – ' + res.nextEnd;
                    } else {
                        text.innerText = 'CLOSED — No more windows today';
                    }
                }
            } catch (e) {
                const bar = document.getElementById('windowStatus');
                const dot = document.getElementById('statusDot');
                const text = document.getElementById('statusText');
                if (bar) bar.className = 'status-closed';
                if (dot) dot.className = 'status-dot closed';
                if (text) text.innerText = 'Connection Error';
            }
        }
