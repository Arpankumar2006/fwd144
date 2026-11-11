function toggleRoleFields() {
    const role = document.getElementById('login-role').value;
    const fieldName = document.getElementById('field-name');
    const fieldId = document.getElementById('field-id');
    const fieldPass = document.getElementById('field-passcode');

    if (role === 'admin') {
        fieldName.style.display = 'none';
        fieldId.style.display = 'none';
        fieldPass.style.display = 'block';
        document.getElementById('admin-pass').required = true;
        document.getElementById('login-name').required = false;
        document.getElementById('login-id').required = false;
    } else {
        fieldName.style.display = 'block';
        fieldId.style.display = 'block';
        fieldPass.style.display = 'none';
        document.getElementById('admin-pass').required = false;
        document.getElementById('login-name').required = true;
        document.getElementById('login-id').required = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('hostify_active_user'));
    if (currentUser) {
        renderDashboard(currentUser);
    }
});
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.getElementById('login-role').value;
        let user;

        if (role === 'admin') {
            const pass = document.getElementById('admin-pass').value.trim();
            if (pass !== 'admin123') {
                alert('Incorrect Admin Passcode! (Default is admin123)');
                return;
            }
            user = { role: 'admin', name: 'Hostel Warden', loginId: 'ADMIN-01' };
        } else {
            const name = document.getElementById('login-name').value.trim();
            const loginId = document.getElementById('login-id').value.trim();
            user = { role: 'student', name, loginId };
        }

        localStorage.setItem('hostify_active_user', JSON.stringify(user));
        renderDashboard(user);
    });
}

function renderDashboard(user) {
    const loginSec = document.getElementById('login-section');
    const homeView = document.getElementById('view-home');
    const dashView = document.getElementById('view-dashboard');
    const navDash = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');

    if (loginSec) loginSec.style.display = 'none';
    if (homeView) homeView.style.display = 'none';
    if (dashView) dashView.style.display = 'block';
    if (navDash) navDash.style.display = 'inline-block';
    if (navLogout) navLogout.style.display = 'inline-block';

    const userDisplay = document.getElementById('user-display');
    const roleDisplay = document.getElementById('role-display');
    if (userDisplay) userDisplay.innerText = user.name;
    if (roleDisplay) roleDisplay.innerText = user.role;

    if (user.role === 'admin') {
        const adminPanel = document.getElementById('admin-panel');
        const studentPanel = document.getElementById('student-panel');
        if (adminPanel) adminPanel.style.display = 'block';
        if (studentPanel) studentPanel.style.display = 'none';
        loadAdminRequests();
    } else {
        const adminPanel = document.getElementById('admin-panel');
        const studentPanel = document.getElementById('student-panel');
        if (studentPanel) studentPanel.style.display = 'block';
        if (adminPanel) adminPanel.style.display = 'none';
        loadRequestHistory(user.loginId);
    }
}
function showDashboardView() {
    const currentUser = JSON.parse(localStorage.getItem('hostify_active_user'));
    if (!currentUser) {
        alert('Please sign in first.');
        window.location.href = 'index.html';
        return;
    }
    renderDashboard(currentUser);
}

function logoutUser() {
    localStorage.removeItem('hostify_active_user');
    window.location.href = 'index.html';
}

const requestForm = document.getElementById('requestForm');
if (requestForm) {
    requestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentUser = JSON.parse(localStorage.getItem('hostify_active_user'));
        if (!currentUser) return;

        const category = document.getElementById('req-cat').value;
        const room = document.getElementById('req-room').value.trim();
        const desc = document.getElementById('req-desc').value.trim();
        
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const ticketId = 'HST-' + Math.floor(100 + Math.random() * 900);

        const newRequest = {
            ticketId,
            loginId: currentUser.loginId,
            category,
            room,
            desc,
            otp,
            status: 'Pending'
        };

        const allRequests = JSON.parse(localStorage.getItem('hostify_all_requests')) || [];
        allRequests.push(newRequest);
        localStorage.setItem('hostify_all_requests', JSON.stringify(allRequests));

        const latestOtpEl = document.getElementById('latest-otp');
        const otpContainer = document.getElementById('otp-card-container');
        if (latestOtpEl) latestOtpEl.innerText = otp;
        if (otpContainer) otpContainer.style.display = 'block';

        requestForm.reset();
        loadRequestHistory(currentUser.loginId);
    });
}
function loadRequestHistory(loginId) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    const allRequests = JSON.parse(localStorage.getItem('hostify_all_requests')) || [];
    const userRequests = allRequests.filter(r => r.loginId === loginId);
    tbody.innerHTML = '';

    if (userRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #769fcd;">No requests submitted yet.</td></tr>`;
        return;
    }

    userRequests.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${req.ticketId}</strong></td>
            <td>${req.category}</td>
            <td>${req.room}</td>
            <td>${req.desc}</td>
            <td><span style="background: #0d2137; color: #ffb400; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${req.otp}</span></td>
            <td><span style="color: ${req.status === 'Resolved' ? '#2ecc71' : '#d9534f'}; font-weight: bold;">${req.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadAdminRequests() {
    const tbody = document.getElementById('admin-tbody');
    if (!tbody) return;

    const allRequests = JSON.parse(localStorage.getItem('hostify_all_requests')) || [];
    tbody.innerHTML = '';

    if (allRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #769fcd;">No requests registered in system.</td></tr>`;
        return;
    }

    allRequests.forEach((req, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${req.ticketId}</strong></td>
            <td>${req.loginId}</td>
            <td>${req.category}</td>
            <td><strong>${req.room}</strong>: ${req.desc}</td>
            <td><code>${req.otp}</code></td>
            <td>
                ${req.status === 'Pending' ? `<button onclick="resolveTicket(${index})" style="padding: 4px 10px; font-size: 12px; background: #2ecc71;">Resolve</button>` : '<span style="color: #2ecc71; font-weight: bold;">Resolved ✓</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resolveTicket(index) {
    const allRequests = JSON.parse(localStorage.getItem('hostify_all_requests')) || [];
    const enteredOtp = prompt(`Enter student verification OTP (${allRequests[index].otp}) to close ticket ${allRequests[index].ticketId}:`);
    
    if (enteredOtp === allRequests[index].otp) {
        allRequests[index].status = 'Resolved';
        localStorage.setItem('hostify_all_requests', JSON.stringify(allRequests));
        loadAdminRequests();
        alert('Ticket verified and marked as Resolved successfully!');
    } else if (enteredOtp !== null) {
        alert('Incorrect OTP entered. Resolution cancelled.');
    }
}

const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('feedback-success').style.display = 'block';
        feedbackForm.reset();
        setTimeout(() => {
            document.getElementById('feedback-success').style.display = 'none';
        }, 4000);
    });
}

const queryForm = document.getElementById('queryForm');
if (queryForm) {
    queryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('query-success').style.display = 'block';
        queryForm.reset();
        setTimeout(() => {
            document.getElementById('query-success').style.display = 'none';
        }, 4000);
    });
}
