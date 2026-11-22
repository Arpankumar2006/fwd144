const STORAGE_KEYS = {
    users: 'hostify_students',
    requests: 'hostify_requests_v2',
    messageLogs: 'hostify_message_logs',
    activeUser: 'hostify_active_user'
};

const ADMIN_EMAIL = 'warden@hostify.local';
const ADMIN_PASSWORD = 'admin123';
const ISSUE_CATEGORIES = ['Electrical', 'Plumbing', 'Housekeeping'];
let studentAuthMode = 'login';
let selectedRequestId = null;

function readStoredValue(key, fallback) {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;

    try {
        return JSON.parse(stored);
    } catch (error) {
        console.error(`Unable to read ${key} from local storage.`, error);
        throw new Error('Saved portal data is unreadable. Please check this browser’s local storage.');
    }
}

function readCollection(key) {
    const value = readStoredValue(key, []);
    if (!Array.isArray(value)) {
        throw new Error('Saved portal data has an unexpected format.');
    }
    return value;
}

function readMessageLogs() {
    const logs = readStoredValue(STORAGE_KEYS.messageLogs, { feedback: [], contacts: [] });
    if (!logs || !Array.isArray(logs.feedback) || !Array.isArray(logs.contacts)) {
        throw new Error('Saved feedback and contact logs have an unexpected format.');
    }
    return logs;
}

function saveValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function createLogId(entries) {
    let id;
    do {
        id = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    } while (entries.some(entry => entry.id === id));
    return id;
}

function showMessage(element, message, isError) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('error-message', Boolean(isError));
}

function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function makeButton(text, className, handler) {
    const button = makeElement('button', className, text);
    button.type = 'button';
    button.addEventListener('click', handler);
    return button;
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function homePath() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function getWordCount(text) {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}

function createRequestId(requests) {
    let id;
    do {
        id = `HST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    } while (requests.some(request => request.id === id));
    return id;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getLocalDateValue() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function setHidden(element, isHidden) {
    if (!element) return;
    element.hidden = isHidden;
    if (!isHidden) {
        element.style.removeProperty('display');
    }
}

function updateAuthFields() {
    const role = document.getElementById('login-role');
    const studentAuth = document.getElementById('student-auth');
    const nameGroup = document.getElementById('auth-name-group');
    const emailGroup = document.getElementById('auth-email-group');
    const passwordGroup = document.getElementById('auth-password-group');
    const submit = document.getElementById('auth-submit');
    const credentials = document.getElementById('admin-credentials');
    const name = document.getElementById('auth-name');
    const password = document.getElementById('auth-password');
    const roleValue = role ? role.value : '';
    const isStudent = roleValue === 'student';
    const isAdmin = roleValue === 'admin';
    const showStudentForm = isStudent && studentAuthMode !== '';
    const showFields = showStudentForm || isAdmin;
    const isSignup = isStudent && studentAuthMode === 'signup';

    setHidden(studentAuth, !isStudent);
    setHidden(nameGroup, !isSignup);
    setHidden(emailGroup, !showFields);
    setHidden(passwordGroup, !showFields);
    setHidden(credentials, !isAdmin);
    setHidden(submit, !showFields);
    if (name) name.required = isSignup;
    if (password) {
        password.required = showFields;
        password.autocomplete = isSignup ? 'new-password' : 'current-password';
    }
    if (submit) {
        submit.textContent = isAdmin || studentAuthMode === 'login' ? 'Log In' : 'Create Account';
    }
}

function setStudentAuthMode(mode) {
    studentAuthMode = mode;
    document.querySelectorAll('.mode-button').forEach(button => {
        button.classList.toggle('active', button.dataset.mode === mode);
        button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });
    const help = document.getElementById('student-mode-help');
    if (help) {
        help.textContent = mode === 'signup'
            ? 'Create an account saved in this browser. You will use these details to sign in next time.'
            : 'Use the email and password registered on this browser.';
    }
    showMessage(document.getElementById('auth-message'), '');
    updateAuthFields();
}

function handleAuthSubmit(event) {
    event.preventDefault();
    const message = document.getElementById('auth-message');
    showMessage(message, '');

    const role = document.getElementById('login-role').value;
    const email = normalizeEmail(document.getElementById('auth-email').value);
    const password = document.getElementById('auth-password').value;
    let user;

    try {
        if (role === 'admin') {
            if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
                showMessage(message, 'The administrator email or password is incorrect.', true);
                return;
            }
            user = { role: 'admin', name: 'Hostel Warden', email: ADMIN_EMAIL };
        } else if (role === 'student' && studentAuthMode === 'signup') {
            const name = document.getElementById('auth-name').value.trim();
            if (!name || !email || !document.getElementById('auth-email').validity.valid || password.length < 6) {
                showMessage(message, 'Enter your name, a valid email address, and a password of at least 6 characters.', true);
                return;
            }

            const students = readCollection(STORAGE_KEYS.users);
            if (students.some(student => normalizeEmail(student.email) === email)) {
                showMessage(message, 'An account with this email already exists. Please log in instead.', true);
                return;
            }

            const student = { name, email, password };
            students.push(student);
            saveValue(STORAGE_KEYS.users, students);
            user = { role: 'student', name: student.name, email: student.email };
        } else if (role === 'student' && studentAuthMode === 'login') {
            const students = readCollection(STORAGE_KEYS.users);
            const student = students.find(account =>
                normalizeEmail(account.email) === email && account.password === password
            );
            if (!student) {
                showMessage(message, 'No matching student account was found. Sign up first or check your email and password.', true);
                return;
            }
            user = { role: 'student', name: student.name, email: student.email };
        } else {
            showMessage(message, 'Choose Admin or Student, then select a student account action.', true);
            return;
        }

        saveValue(STORAGE_KEYS.activeUser, user);
        document.getElementById('authForm').reset();
        renderDashboard(user);
    } catch (error) {
        console.error('Unable to complete sign-in.', error);
        showMessage(message, error.message || 'Unable to save or read local portal data.', true);
    }
}

function renderDashboard(user) {
    const home = document.getElementById('view-home');
    const dashboard = document.getElementById('view-dashboard');
    const homeContent = document.getElementById('home-content');
    if (!home || !dashboard) return;

    setHidden(home, true);
    setHidden(homeContent, true);
    setHidden(dashboard, false);
    setHidden(document.getElementById('nav-dashboard'), false);
    setHidden(document.getElementById('nav-logout'), false);
    document.getElementById('user-display').textContent = user.name;
    document.getElementById('role-display').textContent = user.role === 'admin' ? 'Administrator' : user.email;

    const isAdmin = user.role === 'admin';
    setHidden(document.getElementById('admin-panel'), !isAdmin);
    setHidden(document.getElementById('student-panel'), isAdmin);

    try {
        if (isAdmin) {
            renderAdminRequests();
            try {
                renderAdminMessageLogs();
            } catch (error) {
                console.error('Unable to display feedback and contact logs.', error);
                document.getElementById('feedback-log').textContent = error.message || 'Unable to load feedback logs.';
                document.getElementById('contact-log').textContent = error.message || 'Unable to load contact logs.';
            }
        } else {
            renderStudentRequests(user.email);
        }
    } catch (error) {
        console.error('Unable to display saved requests.', error);
        const container = document.getElementById(isAdmin ? 'admin-pending' : 'student-requests');
        if (container) container.textContent = error.message || 'Unable to load saved requests.';
    }
}

function logoutUser(event) {
    if (event) event.preventDefault();
    try {
        localStorage.removeItem(STORAGE_KEYS.activeUser);
    } catch (error) {
        console.error('Unable to clear the active session.', error);
        alert('Could not sign out because browser storage is unavailable.');
        return;
    }
    window.location.href = homePath();
}

function showDashboardView() {
    try {
        const user = readStoredValue(STORAGE_KEYS.activeUser, null);
        if (!user) {
            window.location.href = homePath();
            return;
        }
        renderDashboard(user);
    } catch (error) {
        alert(error.message || 'Unable to open the dashboard.');
        window.location.href = homePath();
    }
}

function renderTimeline(request) {
    const timeline = makeElement('div', 'request-timeline');
    const stages = ['Request submitted', 'Timeline assigned', 'Completed'];
    const progress = request.status === 'completed' ? 100 : request.timelineDate ? 55 : 15;
    const track = makeElement('div', 'progress-track');
    const fill = makeElement('span', 'progress-fill');
    fill.style.width = `${progress}%`;
    track.appendChild(fill);
    timeline.appendChild(track);

    const labels = makeElement('div', 'timeline-labels');
    stages.forEach((stage, index) => {
        const done = index === 0 || (index === 1 && Boolean(request.timelineDate)) || (index === 2 && request.status === 'completed');
        const label = makeElement('span', done ? 'timeline-label complete' : 'timeline-label', stage);
        labels.appendChild(label);
    });
    timeline.appendChild(labels);

    const status = request.status === 'completed'
        ? 'Completed'
        : request.timelineDate
            ? `Timeline assigned · Expected by ${formatDate(request.timelineDate)}`
            : 'Awaiting admin';
    timeline.appendChild(makeElement('strong', 'timeline-status', status));
    return timeline;
}

function createRequestSummary(request, includeStudent) {
    const card = makeElement('article', 'request-card');
    const header = makeElement('div', 'request-card-header');
    const heading = makeElement('h4', '', `${request.category} · ${request.room}`);
    const ticket = makeElement('span', 'ticket-id', request.id);
    header.append(heading, ticket);
    card.appendChild(header);

    if (includeStudent) {
        card.appendChild(makeElement('p', 'request-owner', `${request.studentName} · ${request.studentEmail}`));
    }
    card.appendChild(makeElement('p', 'request-description', request.description));
    card.appendChild(renderTimeline(request));
    return card;
}

function renderStudentRequests(email) {
    const container = document.getElementById('student-requests');
    if (!container) return;
    container.replaceChildren();

    const requests = readCollection(STORAGE_KEYS.requests)
        .filter(request => normalizeEmail(request.studentEmail) === normalizeEmail(email))
        .sort((a, b) => b.createdAt - a.createdAt);
    if (requests.length === 0) {
        container.appendChild(makeElement('p', 'empty-state', 'You have not submitted any requests yet.'));
        return;
    }

    requests.forEach(request => {
        const card = createRequestSummary(request, false);
        if (request.status !== 'completed') {
            const otp = makeElement('p', 'otp-display');
            otp.append(makeElement('span', '', 'Your verification OTP: '), makeElement('strong', '', request.otp));
            card.appendChild(otp);
        } else if (request.rating) {
            card.appendChild(makeElement('p', 'rating-result', `Your rating: ${'★'.repeat(request.rating)}${'☆'.repeat(5 - request.rating)} (${request.rating}/5)`));
        } else {
            const rating = makeElement('div', 'rating-entry');
            rating.appendChild(makeElement('strong', '', 'Rate the completed service:'));
            const stars = makeElement('div', 'rating-buttons');
            for (let value = 1; value <= 5; value += 1) {
                stars.appendChild(makeButton('☆', 'rating-star', () => saveStudentRating(request.id, value)));
                stars.lastChild.setAttribute('aria-label', `Rate ${value} out of 5`);
            }
            rating.appendChild(stars);
            card.appendChild(rating);
        }
        container.appendChild(card);
    });
}

function renderMessageLog(container, entries, type) {
    container.replaceChildren();
    if (entries.length === 0) {
        container.appendChild(makeElement('p', 'empty-state', `No ${type === 'feedback' ? 'feedback' : 'contact requests'} yet.`));
        return;
    }

    entries
        .slice()
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .forEach(entry => {
            const card = makeElement('article', 'message-log-entry');
            const header = makeElement('div', 'message-log-header');
            const heading = type === 'feedback'
                ? `${entry.rating}/5 star feedback`
                : `${entry.name} · ${entry.email}`;
            header.appendChild(makeElement('strong', '', heading));
            const removeButton = makeButton('×', 'log-delete', () => deleteMessageLogEntry(type, entry.id));
            removeButton.setAttribute('aria-label', `Delete ${type === 'feedback' ? 'feedback' : 'contact request'} entry`);
            removeButton.title = 'Delete this entry';
            header.appendChild(removeButton);
            card.appendChild(header);
            card.appendChild(makeElement('p', 'message-log-text', entry.message));
            card.appendChild(makeElement('small', 'message-log-date', new Date(entry.submittedAt).toLocaleString()));
            container.appendChild(card);
        });
}

function renderAdminMessageLogs() {
    const logs = readMessageLogs();
    renderMessageLog(document.getElementById('feedback-log'), logs.feedback, 'feedback');
    renderMessageLog(document.getElementById('contact-log'), logs.contacts, 'contact');
}

function deleteMessageLogEntry(type, entryId) {
    try {
        const logs = readMessageLogs();
        logs[type] = logs[type].filter(entry => entry.id !== entryId);
        saveValue(STORAGE_KEYS.messageLogs, logs);
        renderAdminMessageLogs();
        showMessage(document.getElementById('message-log-status'), 'Entry deleted.');
    } catch (error) {
        showMessage(document.getElementById('message-log-status'), error.message || 'Unable to delete this entry.', true);
    }
}

function clearMessageLogs() {
    if (!window.confirm('Clear all service feedback and contact requests? This cannot be undone.')) return;

    try {
        saveValue(STORAGE_KEYS.messageLogs, { feedback: [], contacts: [] });
        renderAdminMessageLogs();
        showMessage(document.getElementById('message-log-status'), 'All feedback and contact logs have been cleared.');
    } catch (error) {
        showMessage(document.getElementById('message-log-status'), error.message || 'Unable to clear the logs.', true);
    }
}

function saveStudentRating(requestId, rating) {
    try {
        const requests = readCollection(STORAGE_KEYS.requests);
        const request = requests.find(item => item.id === requestId);
        const user = readStoredValue(STORAGE_KEYS.activeUser, null);
        if (!request || !user || request.status !== 'completed' || request.rating ||
            normalizeEmail(request.studentEmail) !== normalizeEmail(user.email)) {
            return;
        }
        request.rating = rating;
        request.ratedAt = Date.now();
        saveValue(STORAGE_KEYS.requests, requests);
        renderStudentRequests(user.email);
    } catch (error) {
        alert(error.message || 'Unable to save your rating.');
    }
}

function getRequestLocation(request) {
    if (request.block && request.tower) {
        return { block: request.block, tower: request.tower };
    }

    const match = String(request.room || '').match(/Block\s*([AB])\s*[- ]\s*Tower\s*([AB][1-5])/i);
    return match
        ? { block: match[1].toUpperCase(), tower: match[2].toUpperCase() }
        : { block: '', tower: '' };
}

function renderAdminRequests() {
    const sortSelect = document.getElementById('admin-sort');
    const blockFilter = document.getElementById('admin-block-filter');
    const towerFilter = document.getElementById('admin-tower-filter');
    const sortOrder = sortSelect ? sortSelect.value : 'oldest';
    const selectedBlock = blockFilter ? blockFilter.value : '';
    const selectedTower = towerFilter ? towerFilter.value : '';

    let requests = readCollection(STORAGE_KEYS.requests).filter(request => {
        const location = getRequestLocation(request);
        const blockMatches = !selectedBlock || location.block === selectedBlock;
        const towerMatches = !selectedTower || location.tower === selectedTower;
        return blockMatches && towerMatches;
    });
    requests.sort((a, b) => sortOrder === 'oldest'
        ? a.createdAt - b.createdAt
        : b.createdAt - a.createdAt);
    const pending = document.getElementById('admin-pending');
    const completed = document.getElementById('admin-completed');
    pending.replaceChildren();
    completed.replaceChildren();

    const pendingRequests = requests.filter(request => request.status !== 'completed');
    const completedRequests = requests.filter(request => request.status === 'completed');
    if (pendingRequests.length === 0) pending.appendChild(makeElement('p', 'empty-state', 'There are no pending requests.'));
    if (completedRequests.length === 0) completed.appendChild(makeElement('p', 'empty-state', 'There are no completed requests yet.'));

    pendingRequests.forEach(request => {
        const card = createRequestSummary(request, true);
        card.appendChild(makeButton('Open request details', 'secondary-button', () => showAdminDetail(request.id)));
        pending.appendChild(card);
    });
    completedRequests.forEach(request => {
        const card = createRequestSummary(request, true);
        card.appendChild(makeElement('p', 'rating-result', request.rating
            ? `Student rating: ${'★'.repeat(request.rating)}${'☆'.repeat(5 - request.rating)} (${request.rating}/5)`
            : 'Student has not rated this request yet.'));
        card.appendChild(makeButton('View completed request', 'secondary-button', () => showAdminDetail(request.id)));
        completed.appendChild(card);
    });

    if (selectedRequestId && requests.some(request => request.id === selectedRequestId)) {
        showAdminDetail(selectedRequestId);
    } else {
        setHidden(document.getElementById('admin-detail'), true);
    }
}

function showAdminDetail(requestId) {
    selectedRequestId = requestId;
    let request;
    try {
        request = readCollection(STORAGE_KEYS.requests).find(item => item.id === requestId);
    } catch (error) {
        alert(error.message || 'Unable to open this request.');
        return;
    }
    const detail = document.getElementById('admin-detail');
    if (!request || !detail) return;

    detail.replaceChildren();
    detail.appendChild(makeElement('h3', '', `Request details · ${request.id}`));
    const details = makeElement('dl', 'detail-list');
    [
        ['Student', request.studentName],
        ['Student email', request.studentEmail],
        ['Category', request.category],
        ['Room', request.room],
        ['Description', request.description],
        ['Submitted', new Date(request.createdAt).toLocaleString()]
    ].forEach(([term, value]) => {
        details.append(makeElement('dt', '', term), makeElement('dd', '', value));
    });
    detail.appendChild(details);

    if (request.status !== 'completed') {
        const timelineForm = makeElement('form', 'inline-form');
        timelineForm.innerHTML = '<label for="timeline-date">Expected completion date</label><input id="timeline-date" type="date" required><button type="submit">Assign timeline</button>';
        const dateInput = timelineForm.querySelector('input');
        dateInput.value = request.timelineDate || '';
        dateInput.min = getLocalDateValue();
        timelineForm.addEventListener('submit', event => {
            event.preventDefault();
            updateRequest(request.id, item => { item.timelineDate = dateInput.value; });
        });
        detail.appendChild(timelineForm);

        const otpForm = makeElement('form', 'inline-form');
        otpForm.innerHTML = '<label for="close-otp">Student verification OTP</label><input id="close-otp" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" required><button type="submit">Verify OTP &amp; close request</button>';
        otpForm.addEventListener('submit', event => {
            event.preventDefault();
            const enteredOtp = otpForm.querySelector('input').value.trim();
            if (enteredOtp !== request.otp) {
                showMessage(detail.querySelector('.detail-message'), 'That OTP does not match. The request remains pending.', true);
                return;
            }
            updateRequest(request.id, item => {
                item.status = 'completed';
                item.completedAt = Date.now();
            });
        });
        detail.appendChild(otpForm);
    } else {
        detail.appendChild(makeElement('p', 'completion-note', `Completed ${new Date(request.completedAt).toLocaleString()}.`));
        detail.appendChild(makeElement('p', 'rating-result', request.rating
            ? `Student rating: ${'★'.repeat(request.rating)}${'☆'.repeat(5 - request.rating)} (${request.rating}/5)`
            : 'Student has not rated this request yet.'));
    }

    detail.appendChild(makeElement('p', 'form-message detail-message'));
    detail.appendChild(makeButton('Close details', 'secondary-button', () => {
        selectedRequestId = null;
        setHidden(detail, true);
    }));
    setHidden(detail, false);
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateRequest(requestId, change) {
    try {
        const requests = readCollection(STORAGE_KEYS.requests);
        const request = requests.find(item => item.id === requestId);
        if (!request) throw new Error('This request could not be found.');
        change(request);
        saveValue(STORAGE_KEYS.requests, requests);
        renderAdminRequests();
    } catch (error) {
        alert(error.message || 'Unable to update the request.');
    }
}

function setupMainApp() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;

    const blockSelect = document.getElementById('req-block');
    const towerSelect = document.getElementById('req-tower');

    if (blockSelect && towerSelect) {
        blockSelect.addEventListener('change', () => {
            const block = blockSelect.value;
            towerSelect.replaceChildren();
            towerSelect.add(new Option('Choose a tower', ''));

            if (block === 'A' || block === 'B') {
                for (let number = 1; number <= 5; number++) {
                    const tower = `${block}${number}`;
                    towerSelect.add(new Option(tower, tower));
                }
                towerSelect.disabled = false;
            } else {
                towerSelect.disabled = true;
            }
        });

        towerSelect.disabled = true;
    }

    const adminBlockFilter = document.getElementById('admin-block-filter');
    const adminTowerFilter = document.getElementById('admin-tower-filter');
    const adminSort = document.getElementById('admin-sort');

    if (adminBlockFilter && adminTowerFilter) {
        adminBlockFilter.addEventListener('change', () => {
            const block = adminBlockFilter.value;
            adminTowerFilter.replaceChildren();
            adminTowerFilter.add(new Option('All towers', ''));

            if (block === 'A' || block === 'B') {
                for (let number = 1; number <= 5; number++) {
                    const tower = `${block}${number}`;
                    adminTowerFilter.add(new Option(tower, tower));
                }
                adminTowerFilter.disabled = false;
            } else {
                adminTowerFilter.disabled = true;
            }
            adminTowerFilter.value = '';
            renderAdminRequests();
        });

        adminTowerFilter.addEventListener('change', renderAdminRequests);
        adminSort?.addEventListener('change', renderAdminRequests);
    }

    const role = document.getElementById('login-role');
    role.addEventListener('change', () => {
        showMessage(document.getElementById('auth-message'), '');
        updateAuthFields();
    });
    document.querySelectorAll('.mode-button').forEach(button => {
        button.addEventListener('click', () => setStudentAuthMode(button.dataset.mode));
    });
    authForm.addEventListener('submit', handleAuthSubmit);
    document.getElementById('nav-logout').addEventListener('click', logoutUser);
    document.getElementById('dashboard-logout').addEventListener('click', logoutUser);
    document.getElementById('clear-message-logs').addEventListener('click', clearMessageLogs);
    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEYS.messageLogs) return;
        try {
            const user = readStoredValue(STORAGE_KEYS.activeUser, null);
            if (user && user.role === 'admin') renderAdminMessageLogs();
        } catch (error) {
            showMessage(document.getElementById('message-log-status'), error.message || 'Unable to refresh the logs.', true);
        }
    });
    setStudentAuthMode('login');

    const description = document.getElementById('req-desc');
    description.addEventListener('input', () => {
        document.getElementById('word-count').textContent = getWordCount(description.value);
    });
    document.getElementById('requestForm').addEventListener('submit', event => {
        event.preventDefault();
        const message = document.getElementById('request-message');
        showMessage(message, '');
        let user;
        try {
            user = readStoredValue(STORAGE_KEYS.activeUser, null);
        } catch (error) {
            showMessage(message, error.message || 'Unable to read the active session.', true);
            return;
        }
        const category = document.getElementById('req-cat').value;
        const block = document.getElementById('req-block').value;
        const tower = document.getElementById('req-tower').value;
        const room = block && tower ? `Block ${block} - Tower ${tower}` : '';
        const text = description.value.trim();
        const words = getWordCount(text);
        if (!user || user.role !== 'student') {
            showMessage(message, 'Sign in as a student before submitting a request.', true);
            return;
        }
        if (!ISSUE_CATEGORIES.includes(category) || !block || !tower || !words || words > 200) {
            showMessage(message, 'Choose a category, block, tower, and describe the issue in no more than 200 words.', true);
            return;
        }

        try {
            const requests = readCollection(STORAGE_KEYS.requests);
            requests.push({
                id: createRequestId(requests),
                studentName: user.name,
                studentEmail: user.email,
                category,
                room,
                block,
                tower,
                description: text,
                otp: String(Math.floor(100000 + Math.random() * 900000)),
                status: 'pending',
                timelineDate: null,
                rating: null,
                createdAt: Date.now()
            });
            saveValue(STORAGE_KEYS.requests, requests);
            event.currentTarget.reset();
            document.getElementById('word-count').textContent = '0';
            renderStudentRequests(user.email);
        } catch (error) {
            console.error('Unable to submit the maintenance request.', error);
            showMessage(message, error.message || 'Unable to save the request in this browser.', true);
        }
    });

    try {
        const user = readStoredValue(STORAGE_KEYS.activeUser, null);
        const validUser = user && (
            (user.role === 'admin' && user.email === ADMIN_EMAIL) ||
            (user.role === 'student' && typeof user.name === 'string' && typeof user.email === 'string')
        );
        if (validUser) {
            renderDashboard(user);
        } else {
            if (user) localStorage.removeItem(STORAGE_KEYS.activeUser);
            updateAuthFields();
        }
    } catch (error) {
        console.error('Unable to restore the saved session.', error);
        showMessage(document.getElementById('auth-message'), error.message, true);
    }
}

function setupInfoForms() {
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', event => {
            event.preventDefault();
            const result = document.getElementById('feedback-success');
            const selectedRating = feedbackForm.querySelector('input[name="rating"]:checked');
            const message = document.getElementById('fb-text').value.trim();
            if (!selectedRating || !message) return;

            try {
                const logs = readMessageLogs();
                logs.feedback.push({
                    id: createLogId(logs.feedback),
                    rating: Number(selectedRating.value),
                    message,
                    submittedAt: Date.now()
                });
                saveValue(STORAGE_KEYS.messageLogs, logs);
                feedbackForm.reset();
                result.textContent = 'Thank you for your valuable feedback!';
                result.style.color = '#2ecc71';
            } catch (error) {
                result.textContent = error.message || 'Unable to save your feedback in this browser.';
                result.style.color = '#b42318';
            }
            result.style.display = 'block';
            setTimeout(() => { result.style.display = 'none'; }, 4000);
        });
    }

    const queryForm = document.getElementById('queryForm');
    if (queryForm) {
        queryForm.addEventListener('submit', event => {
            event.preventDefault();
            const result = document.getElementById('query-success');
            const name = document.getElementById('q-name').value.trim();
            const email = document.getElementById('q-email').value.trim();
            const message = document.getElementById('q-msg').value.trim();
            if (!name || !email || !message) return;

            try {
                const logs = readMessageLogs();
                logs.contacts.push({
                    id: createLogId(logs.contacts),
                    name,
                    email,
                    message,
                    submittedAt: Date.now()
                });
                saveValue(STORAGE_KEYS.messageLogs, logs);
                queryForm.reset();
                result.textContent = 'Your query has been submitted successfully!';
                result.style.color = '#2ecc71';
            } catch (error) {
                result.textContent = error.message || 'Unable to save your query in this browser.';
                result.style.color = '#b42318';
            }
            result.style.display = 'block';
            setTimeout(() => { result.style.display = 'none'; }, 4000);
        });
    }

    const activeUser = readStoredValue(STORAGE_KEYS.activeUser, null);
    if (activeUser && !document.getElementById('view-home')) {
        setHidden(document.getElementById('nav-dashboard'), false);
        setHidden(document.getElementById('nav-logout'), false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupMainApp();
        setupInfoForms();
    } catch (error) {
        console.error('Unable to initialize Hostify.', error);
        const message = document.getElementById('auth-message');
        if (message) showMessage(message, error.message || 'Unable to initialize this page.', true);
    }
});
