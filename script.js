document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('hostify_active_user'));
    if (currentUser) {
        // If logged in, show dashboard link across pages if applicable
        const navDash = document.getElementById('nav-dashboard');
        if (navDash) navDash.style.display = 'inline-block';

        const loginSec = document.getElementById('login-section');
        if (loginSec) loginSec.style.display = 'none';

        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.innerText = currentUser.name;
            document.getElementById('id-display').innerText = currentUser.loginId;
            loadRequestHistory(currentUser.loginId);
        }
    }
});

// Function to switch to dashboard view on index.html
function showDashboardView() {
    const currentUser = JSON.parse(localStorage.getItem('hostify_active_user'));
    if (!currentUser) {
        alert('Please sign in first on the home page.');
        window.location.href = 'index.html';
        return;
    }
    const homeView = document.getElementById('view-home');
    const dashView = document.getElementById('view-dashboard');
    if (homeView && dashView) {
        homeView.style.display = 'none';
        dashView.style.display = 'block';
    }
}

// Login Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('login-name').value.trim();
        const loginId = document.getElementById('login-id').value.trim();

        const user = { name, loginId };
        localStorage.setItem('hostify_active_user', JSON.stringify(user));
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav-dashboard').style.display = 'inline-block';
        showDashboardView();
    });
}

function logoutUser() {
    localStorage.removeItem('hostify_active_user');
    window.location.href = 'index.html';
}

// Maintenance Request Handler
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

        document.getElementById('latest-otp').innerText = otp;
        document.getElementById('otp-card-container').style.display = 'block';

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
            <td><span style="color: #d9534f; font-weight: bold;">${req.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Feedback Form Handler (about.html)
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

// Contact Query Form Handler (contact.html)
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