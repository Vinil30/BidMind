// Store form data globally
let formData = {
    title: '',
    elevator_pitch: '',
    industry: '',
    stage: '',
    funding_amount: '',
    problem_statement: '',
    solution: '',
    target_market: '',
    competitive_advantage: '',
    funding_goal: '',
    monthly_revenue: '',
    cac: '',
    ltv: '',
    growth_rate: '',
    burn_rate: '',
    runway: ''
};

// Current state
let currentPitchId = null;
let currentSection = 'dashboard';

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeModals();
    loadUserPitches();
    loadEntrepreneurAnalytics();
    showSection('dashboard');
});

// Navigation functionality
function initializeNavigation() {
    // Dashboard navigation
    document.querySelectorAll('.dashboard-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.textContent.toLowerCase().replace(' ', '-');
            showSection(section);
            
            // Update active nav item
            document.querySelectorAll('.dashboard-nav .nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // New Pitch button
    document.querySelectorAll('#new-pitch-btn, .my-pitches-new-btn').forEach(button => {
        button.addEventListener('click', function() {
            showSection('submit-pitch');
            document.querySelectorAll('.dashboard-nav .nav-item').forEach(nav => nav.classList.remove('active'));
            const submitNav = [...document.querySelectorAll('.dashboard-nav .nav-item')].find(nav => nav.textContent.trim() === 'Submit Pitch');
            if (submitNav) submitNav.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    currentSection = sectionName;
    
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the selected section
    const sectionMap = {
        'dashboard': '.content-section:nth-child(1)',
        'my-pitches': '.content-section:nth-child(2)',
        'submit-pitch': '.content-section:nth-child(3)',
        'investor-matches': '.content-section:nth-child(4)',
        'analytics': '.content-section:nth-child(5)'
    };
    
    const selector = sectionMap[sectionName];
    if (selector) {
        document.querySelector(selector).style.display = 'block';
    }
}

// Modal functionality
function initializeModals() {
    // Close modals when clicking X
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Tab functionality
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Save current tab data before switching
        saveCurrentTabData();
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding content
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // Update review section when review tab is activated
        if (tabId === 'review') {
            updateReviewSection();
        }
    }); 
});

// Save data from current tab
function saveCurrentTabData() {
    const basicTab = document.getElementById('basic-tab');
    const detailsTab = document.getElementById('details-tab');
    const financialsTab = document.getElementById('financials-tab');
    
    // Save basic info
    if (basicTab.classList.contains('active')) {
        const inputs = basicTab.querySelectorAll('input, textarea, select');
        const textInputs = basicTab.querySelectorAll('input[type="text"]');
        const textareas = basicTab.querySelectorAll('textarea');
        const selects = basicTab.querySelectorAll('select');
        
        // Get title from first text input
        if (textInputs[0]) {
            formData.title = textInputs[0].value;
        }
        
        // Get elevator pitch from first textarea
        if (textareas[0]) {
            formData.elevator_pitch = textareas[0].value;
        }
        
        // Get funding amount from second text input
        if (textInputs[1]) {
            formData.funding_amount = textInputs[1].value;
        }
        
        // Get industry and stage from selects
        if (selects[0]) formData.industry = selects[0].value;
        if (selects[1]) formData.stage = selects[1].value;
    }
    
    // Save business details
    if (detailsTab.classList.contains('active')) {
        const textareas = detailsTab.querySelectorAll('textarea');
        if (textareas[0]) formData.problem_statement = textareas[0].value;
        if (textareas[1]) formData.solution = textareas[1].value;
        if (textareas[2]) formData.target_market = textareas[2].value;
        if (textareas[3]) formData.competitive_advantage = textareas[3].value;
    }
    
    // Save financials
    if (financialsTab.classList.contains('active')) {
        formData.funding_goal = document.getElementById('funding-goal')?.value || '';
        formData.monthly_revenue = document.getElementById('monthly-revenue')?.value || '';
        formData.cac = document.getElementById('cac')?.value || '';
        formData.ltv = document.getElementById('ltv')?.value || '';
        formData.growth_rate = document.getElementById('growth-rate')?.value || '';
        formData.burn_rate = document.getElementById('burn-rate')?.value || '';
        formData.runway = document.getElementById('runway')?.value || '';
    }
}

// Next button functionality
document.querySelectorAll('.next-tab').forEach(button => {
    button.addEventListener('click', () => {
        saveCurrentTabData();
        const nextTab = button.getAttribute('data-next');
        document.querySelector(`.tab[data-tab="${nextTab}"]`).click();
    });
});

// Previous button functionality
document.querySelectorAll('.prev-tab').forEach(button => {
    button.addEventListener('click', () => {
        saveCurrentTabData();
        const prevTab = button.getAttribute('data-prev');
        document.querySelector(`.tab[data-tab="${prevTab}"]`).click();
    });
});

// Update review section with form data
function updateReviewSection() {
    // Save any unsaved data first
    saveCurrentTabData();
    
    // Basic Info
    document.getElementById('review-title').textContent = formData.title || '-';
    document.getElementById('review-elevator').textContent = formData.elevator_pitch || '-';
    document.getElementById('review-industry').textContent = formData.industry || '-';
    document.getElementById('review-stage').textContent = formData.stage || '-';
    document.getElementById('review-funding-amount').textContent = formData.funding_amount || '-';
    
    // Business Details
    document.getElementById('review-problem').textContent = formData.problem_statement || '-';
    document.getElementById('review-solution').textContent = formData.solution || '-';
    document.getElementById('review-market').textContent = formData.target_market || '-';
    document.getElementById('review-advantage').textContent = formData.competitive_advantage || '-';
    
    // Financials
    document.getElementById('review-funding-goal').textContent = formData.funding_goal ? `$${parseInt(formData.funding_goal).toLocaleString()}` : '-';
    document.getElementById('review-revenue').textContent = formData.monthly_revenue ? `$${parseInt(formData.monthly_revenue).toLocaleString()}` : '-';
    
    if (formData.cac && formData.ltv) {
        const ratio = (parseFloat(formData.ltv) / parseFloat(formData.cac)).toFixed(1);
        document.getElementById('review-cac-ltv').textContent = `${ratio}x`;
    } else {
        document.getElementById('review-cac-ltv').textContent = '-';
    }
    
    document.getElementById('review-growth').textContent = formData.growth_rate ? `${formData.growth_rate}%` : '-';
    document.getElementById('review-runway').textContent = formData.runway ? `${formData.runway} months` : '-';
}

// Submit pitch functionality
document.getElementById('submit-pitch').addEventListener('click', async function() {
    const submitBtn = this;
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Make sure we have the latest data
        saveCurrentTabData();
        
        // Prepare pitch data
        const pitchData = {
            title: formData.title,
            elevator_pitch: formData.elevator_pitch,
            industry: formData.industry,
            stage: formData.stage,
            funding_amount: formData.funding_amount,
            problem_statement: formData.problem_statement,
            solution: formData.solution,
            target_market: formData.target_market,
            competitive_advantage: formData.competitive_advantage,
            funding_goal: formData.funding_goal,
            monthly_revenue: formData.monthly_revenue,
            cac: formData.cac,
            ltv: formData.ltv,
            growth_rate: formData.growth_rate,
            burn_rate: formData.burn_rate,
            runway: formData.runway
        };
        
        // Validate required fields
        const requiredFields = ['title', 'elevator_pitch', 'industry', 'stage', 'funding_amount'];
        for (const field of requiredFields) {
            if (!pitchData[field]) {
                throw new Error(`Please fill in all required fields. Missing: ${field}`);
            }
        }
        
        // Send to backend
        const response = await fetch('/api/pitches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pitchData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert('Pitch submitted successfully!');
            // Clear form data
            formData = {
                title: '', elevator_pitch: '', industry: '', stage: '', funding_amount: '',
                problem_statement: '', solution: '', target_market: '', competitive_advantage: '',
                funding_goal: '', monthly_revenue: '', cac: '', ltv: '', growth_rate: '', burn_rate: '', runway: ''
            };
            // Reset form
            resetPitchForm();
            // Reload the page to show the new pitch
            loadUserPitches();
            loadEntrepreneurAnalytics();
            showSection('my-pitches');
        } else {
            throw new Error(result.msg || 'Failed to submit pitch');
        }
        
    } catch (error) {
        alert('Error submitting pitch: ' + error.message);
        console.error('Submission error:', error);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Reset pitch form
function resetPitchForm() {
    // Clear all form fields
    document.querySelectorAll('.pitch-form input, .pitch-form textarea, .pitch-form select').forEach(field => {
        if (field.type !== 'button' && field.type !== 'submit') {
            field.value = '';
        }
    });
    
    // Reset to first tab
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector('.tab[data-tab="basic"]').classList.add('active');
    document.getElementById('basic-tab').classList.add('active');
}

// Function to load user pitches from backend
async function loadUserPitches() {
    try {
        const response = await fetch('/api/pitches');
        const result = await response.json();
        
        if (result.status === 'success') {
            updatePitchesDisplay(result.pitches);
        }
    } catch (error) {
        console.error('Error loading pitches:', error);
    }
}

// Function to update pitches display with real data
function updatePitchesDisplay(pitches) {
    const pitchCardsContainer = document.getElementById('my-pitches-container');
    renderDashboardOverview(pitches || []);
    
    if (!pitches || pitches.length === 0) {
        pitchCardsContainer.innerHTML = `
            <div class="empty-state">
                <p>No pitches yet. Create your first pitch to get started!</p>
            </div>
        `;
        return;
    }
    
    pitchCardsContainer.innerHTML = '';
    
    pitches.forEach(pitch => {
        const statusClass = getStatusClass(pitch.status);
        const statusText = getStatusText(pitch.status);
        const statusIcon = getStatusIcon(pitch.status);
        
        const pitchCard = document.createElement('div');
        pitchCard.className = 'pitch-card';
        pitchCard.innerHTML = `
            <div class="pitch-header">
                <div>
                    <h3 class="pitch-title">${pitch.title}</h3>
                    <p class="pitch-category">${pitch.industry} • ${pitch.stage}</p>
                </div>
                <div class="pitch-status ${statusClass}">
                    ${statusIcon}
                    ${statusText}
                </div>
            </div>
            <p class="pitch-summary">${pitch.elevator_pitch}</p>
            <div class="pitch-actions">
                <button class="btn btn-primary" onclick="viewPitchDetails('${pitch._id}')">View Details</button>
                <button class="btn btn-outline" onclick="editPitch('${pitch._id}')">Edit</button>
            </div>
        `;
        
        pitchCardsContainer.appendChild(pitchCard);
    });
}

function renderDashboardOverview(pitches) {
    const activity = document.getElementById('recent-pitch-activity');
    if (!activity) return;

    if (!pitches.length) {
        activity.innerHTML = '<div class="empty-state"><p>No pitch activity yet. Create your first pitch to start building investor visibility.</p></div>';
        return;
    }

    const recent = pitches.slice(0, 3);
    activity.innerHTML = recent.map(pitch => `
        <div class="activity-item">
            <div>
                <strong>${escapeHtml(pitch.title || 'Untitled Pitch')}</strong>
                <span>${escapeHtml(pitch.industry || 'Industry not set')} · ${escapeHtml(pitch.stage || 'Stage not set')}</span>
            </div>
            <span class="activity-status ${getStatusClass(pitch.status)}">${getStatusText(pitch.status)}</span>
        </div>
    `).join('');
}

async function loadEntrepreneurAnalytics() {
    const container = document.getElementById('entrepreneur-analytics-container');
    const statStrip = document.getElementById('founder-stats');

    try {
        const response = await fetch('/api/analytics/entrepreneur');
        const result = await response.json();
        if (result.status !== 'success') return;

        const analytics = {
            total_pitches: result.analytics?.total_pitches || 0,
            avg_match_rate: result.analytics?.avg_match_rate || 0,
            investor_views: result.analytics?.investor_views || 0,
            active_conversations: result.analytics?.active_conversations || 0
        };

        const cards = `
            <div class="stat-card"><div class="stat-value">${analytics.total_pitches}</div><div class="stat-label">Total Pitches</div></div>
            <div class="stat-card"><div class="stat-value">${analytics.avg_match_rate}%</div><div class="stat-label">Avg. Match Rate</div></div>
            <div class="stat-card"><div class="stat-value">${analytics.investor_views}</div><div class="stat-label">Investor Views</div></div>
            <div class="stat-card"><div class="stat-value">${analytics.active_conversations}</div><div class="stat-label">Active Conversations</div></div>
        `;

        if (container) container.innerHTML = cards;
        if (statStrip) statStrip.innerHTML = cards;
    } catch (error) {
        console.error('Error loading entrepreneur analytics:', error);
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// View pitch details
async function viewPitchDetails(pitchId) {
    try {
        const response = await fetch(`/api/pitches/${pitchId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            displayPitchDetails(result.pitch);
        } else {
            throw new Error(result.msg || 'Failed to load pitch details');
        }
    } catch (error) {
        alert('Error loading pitch details: ' + error.message);
        console.error('Error:', error);
    }
}

// Display pitch details in modal
function displayPitchDetails(pitch) {
    const modal = document.getElementById('pitchDetailsModal');
    const content = document.getElementById('pitchDetailsContent');
    
    const statusClass = getStatusClass(pitch.status);
    const statusText = getStatusText(pitch.status);
    const statusIcon = getStatusIcon(pitch.status);
    
    content.innerHTML = `
        <div class="pitch-detail-section">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: #1f2937;">${pitch.title}</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">${pitch.industry} • ${pitch.stage}</p>
                </div>
                <div class="pitch-status ${statusClass}">
                    ${statusIcon}
                    ${statusText}
                </div>
            </div>
        </div>

        <div class="pitch-detail-section">
            <h3>Basic Information</h3>
            <div class="detail-item">
                <span class="detail-label">Elevator Pitch</span>
                <span class="detail-value">${pitch.elevator_pitch || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Funding Amount</span>
                <span class="detail-value">${pitch.funding_amount || 'Not specified'}</span>
            </div>
        </div>

        <div class="pitch-detail-section">
            <h3>Business Details</h3>
            <div class="detail-item">
                <span class="detail-label">Problem Statement</span>
                <span class="detail-value">${pitch.problem_statement || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Solution</span>
                <span class="detail-value">${pitch.solution || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Target Market</span>
                <span class="detail-value">${pitch.target_market || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Competitive Advantage</span>
                <span class="detail-value">${pitch.competitive_advantage || 'Not provided'}</span>
            </div>
        </div>

        <div class="pitch-detail-section">
            <h3>Financial Information</h3>
            <div class="detail-item">
                <span class="detail-label">Funding Goal</span>
                <span class="detail-value">${pitch.funding_goal ? '$' + parseInt(pitch.funding_goal).toLocaleString() : 'Not specified'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Monthly Revenue</span>
                <span class="detail-value">${pitch.monthly_revenue ? '$' + parseInt(pitch.monthly_revenue).toLocaleString() : 'Not specified'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Customer Acquisition Cost</span>
                <span class="detail-value">${pitch.cac ? '$' + pitch.cac : 'Not specified'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Lifetime Value</span>
                <span class="detail-value">${pitch.ltv ? '$' + pitch.ltv : 'Not specified'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Growth Rate</span>
                <span class="detail-value">${pitch.growth_rate ? pitch.growth_rate + '%' : 'Not specified'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Runway</span>
                <span class="detail-value">${pitch.runway ? pitch.runway + ' months' : 'Not specified'}</span>
            </div>
        </div>

        <div class="pitch-actions" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eef2f7;">
            <button class="btn btn-primary" onclick="editPitch('${pitch._id}')">Edit Pitch</button>
            <button class="btn btn-outline" onclick="this.closest('.modal').style.display='none'">Close</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Edit pitch functionality
async function editPitch(pitchId) {
    currentPitchId = pitchId;
    
    try {
        // Close details modal if open
        document.getElementById('pitchDetailsModal').style.display = 'none';
        
        const response = await fetch(`/api/pitches/${pitchId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            displayEditForm(result.pitch);
        } else {
            throw new Error(result.msg || 'Failed to load pitch for editing');
        }
    } catch (error) {
        alert('Error loading pitch for editing: ' + error.message);
        console.error('Error:', error);
    }
}

// Display edit form
function displayEditForm(pitch) {
    const modal = document.getElementById('editPitchModal');
    const formContainer = document.getElementById('editPitchForm');
    
    formContainer.innerHTML = `
        <div class="pitch-form">
            <div class="form-group">
                <label class="form-label">Pitch Title</label>
                <input type="text" class="form-input" value="${pitch.title}" id="edit-title">
            </div>
            
            <div class="form-group">
                <label class="form-label">Elevator Pitch</label>
                <textarea class="form-textarea" id="edit-elevator-pitch">${pitch.elevator_pitch || ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Industry</label>
                    <select class="form-select" id="edit-industry">
                        <option value="">Select Industry</option>
                        <option value="Technology" ${pitch.industry === 'Technology' ? 'selected' : ''}>Technology</option>
                        <option value="Healthcare" ${pitch.industry === 'Healthcare' ? 'selected' : ''}>Healthcare</option>
                        <option value="Consumer Goods" ${pitch.industry === 'Consumer Goods' ? 'selected' : ''}>Consumer Goods</option>
                        <option value="Financial Services" ${pitch.industry === 'Financial Services' ? 'selected' : ''}>Financial Services</option>
                        <option value="Education" ${pitch.industry === 'Education' ? 'selected' : ''}>Education</option>
                        <option value="Other" ${pitch.industry === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Funding Stage</label>
                    <select class="form-select" id="edit-stage">
                        <option value="">Select Stage</option>
                        <option value="Pre-Seed" ${pitch.stage === 'Pre-Seed' ? 'selected' : ''}>Pre-Seed</option>
                        <option value="Seed" ${pitch.stage === 'Seed' ? 'selected' : ''}>Seed</option>
                        <option value="Series A" ${pitch.stage === 'Series A' ? 'selected' : ''}>Series A</option>
                        <option value="Series B" ${pitch.stage === 'Series B' ? 'selected' : ''}>Series B</option>
                        <option value="Series C+" ${pitch.stage === 'Series C+' ? 'selected' : ''}>Series C+</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Funding Amount</label>
                <input type="text" class="form-input" value="${pitch.funding_amount || ''}" id="edit-funding-amount">
            </div>

            <div class="form-group">
                <label class="form-label">Problem Statement</label>
                <textarea class="form-textarea" id="edit-problem">${pitch.problem_statement || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Solution</label>
                <textarea class="form-textarea" id="edit-solution">${pitch.solution || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Target Market</label>
                <textarea class="form-textarea" id="edit-market">${pitch.target_market || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Competitive Advantage</label>
                <textarea class="form-textarea" id="edit-advantage">${pitch.competitive_advantage || ''}</textarea>
            </div>

            <div class="form-actions" style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-primary" onclick="savePitchChanges()">Save Changes</button>
                <button class="btn btn-outline" onclick="this.closest('.modal').style.display='none'">Cancel</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Save pitch changes
async function savePitchChanges() {
    try {
        const updatedPitch = {
            title: document.getElementById('edit-title').value,
            elevator_pitch: document.getElementById('edit-elevator-pitch').value,
            industry: document.getElementById('edit-industry').value,
            stage: document.getElementById('edit-stage').value,
            funding_amount: document.getElementById('edit-funding-amount').value,
            problem_statement: document.getElementById('edit-problem').value,
            solution: document.getElementById('edit-solution').value,
            target_market: document.getElementById('edit-market').value,
            competitive_advantage: document.getElementById('edit-advantage').value
        };

        const response = await fetch(`/api/pitches/${currentPitchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedPitch)
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert('Pitch updated successfully!');
            document.getElementById('editPitchModal').style.display = 'none';
            loadUserPitches(); // Refresh the pitches list
            loadEntrepreneurAnalytics();
        } else {
            throw new Error(result.msg || 'Failed to update pitch');
        }
    } catch (error) {
        alert('Error updating pitch: ' + error.message);
        console.error('Error:', error);
    }
}

// Helper functions for status display
function getStatusClass(status) {
    const statusMap = {
        'matched': 'status-matched',
        'under_review': 'status-review',
        'needs_revision': 'status-rejected'
    };
    return statusMap[status] || 'status-review';
}

function getStatusText(status) {
    const textMap = {
        'matched': 'Matched with investors',
        // 'under_review': 'Under AI Review',
        'needs_revision': 'Needs Revision'
    };
    return textMap[status] || 'Under Review';
}

function getStatusIcon(status) {
    const icons = {
        'matched': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'under_review': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0b5fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 16V12" stroke="#0b5fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 8H12.01" stroke="#0b5fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'needs_revision': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    };
    return icons[status] || icons['under_review'];
}

// Logout functionality
document.querySelector('.login-btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to log out?')) {
        window.location.href = '/logout';
    }
});
