let allLogs = [];

async function loadLogs() {
    const body = document.getElementById('logsBody');
    if (!body) return;
    body.innerHTML = '<tr class="loading-row"><td colspan="5">Loading...</td></tr>';
    try {
        const resp = await fetch('api/getLogs.php');
        if (!resp.ok) throw new Error('Failed to load logs');
        const logs = await resp.json();
        if (!Array.isArray(logs) || logs.length === 0) {
            allLogs = [];
            body.innerHTML = '<tr class="loading-row"><td colspan="5">No logs found</td></tr>';
            return;
        }
        allLogs = logs;
        filterAndDisplayLogs();
    } catch (err) {
        body.innerHTML = '<tr><td colspan="6" style="padding:12px">Error loading logs</td></tr>';
        console.error(err);
    }
}

function filterAndDisplayLogs() {
    const body = document.getElementById('logsBody');
    if (!body) return;
    const filterEl = document.getElementById('logCategoryFilter');
    const filter = filterEl ? filterEl.value : 'all';

    let filteredLogs = allLogs;
    if (filter === 'add') {
        filteredLogs = allLogs.filter(entry => {
            const action = (entry.action || '').toLowerCase();
            return action === 'add' || action === 'create' || action.includes('add');
        });
    } else if (filter === 'edit') {
        filteredLogs = allLogs.filter(entry => {
            const action = (entry.action || '').toLowerCase();
            return action === 'edit' || action === 'update' || action.includes('edit') || action.includes('update');
        });
    }

    if (filteredLogs.length === 0) {
        body.innerHTML = '<tr class="loading-row"><td colspan="5">No logs found for this filter</td></tr>';
        return;
    }

    body.innerHTML = filteredLogs.map(entry => {
        // format timestamp into UTC+8 (Asia/Manila)
        let time = '';
        if (entry.timestamp) {
            try {
                const dt = new Date(entry.timestamp);
                const fmt = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                time = fmt.format(dt);
            } catch (ew) {
                time = entry.timestamp;
            }
        }

        const user = entry.user_id || '';
        const nameBefore = entry.name_before ?? '';
        const nameAfter = entry.name_after ?? '';
        const name = nameAfter || nameBefore || '';
        const priceBefore = entry.price_before ?? '';
        const priceAfter = entry.price_after ?? '';
        return `<tr>
                <td class="logs-cell" data-label="Time">${time}</td>
                <td class="logs-cell" data-label="User">${user}</td>
                <td class="logs-cell" data-label="Name">${name}</td>
                <td class="logs-cell" data-label="Price (Before)">${priceBefore}</td>
                <td class="logs-cell" data-label="Price (After)">${priceAfter}</td>
            </tr>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('refreshLogsBtn');
    const filterSelect = document.getElementById('logCategoryFilter');
    if (btn) btn.addEventListener('click', loadLogs);
    if (filterSelect) filterSelect.addEventListener('change', filterAndDisplayLogs);
    loadLogs();
});
