// Investor Dashboard Functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Add this function to handle feed refresh
async function refreshFeed() {
    const refreshBtn = document.getElementById('refresh-opportunities');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `
        <div class="loading-spinner small"></div>
        Refreshing Feed...
    `;
    
    try {
        const response = await fetch('/api/feed/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Feed refresh initiated! New opportunities will appear shortly.', 'success');
            // Reload opportunities after a short delay
            setTimeout(loadOpportunities, 2000);
        } else {
            showNotification('Error refreshing feed: ' + data.msg, 'error');
        }
    } catch (error) {
        console.error('Error refreshing feed:', error);
        showNotification('Error refreshing feed. Please try again.', 'error');
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 4V10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Refresh Feed
        `;
    }
}

// Update the refresh button event listener
function initializeDashboard() {
    // Setup navigation
    setupNavigation();
    
    // Load initial section
    loadActiveSection();
    
    // Setup refresh button - now calls refreshFeed instead of refreshOpportunities
    document.getElementById('refresh-opportunities').addEventListener('click', refreshFeed);
    
    // Setup filters
    setupFilters();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Show target section
            const targetSection = this.getAttribute('data-section');
            document.getElementById(`${targetSection}-section`).classList.add('active');
            
            // Load section data
            loadSectionData(targetSection);
        });
    });
}

function loadActiveSection() {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        const targetSection = activeNav.getAttribute('data-section');
        loadSectionData(targetSection);
    }
}

function loadSectionData(section) {
    switch(section) {
        case 'opportunities':
            loadOpportunities();
            break;
        case 'portfolio':
            loadPortfolio();
            break;
        case 'preferences':
            loadPreferences();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'summaries':
            loadSummaries();
            break;
    }
}

function setupFilters() {
    const filters = ['industry-filter', 'stage-filter', 'sort-filter'];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', applyFilters);
        }
    });
}

function applyFilters() {
    loadOpportunities();
}
async function loadOpportunities() {
    const container = document.getElementById('opportunities-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading opportunities...</p>
        </div>
    `;
    
    try {
        console.log('🚀 Starting loadOpportunities...');
        
        const response = await fetch('/api/opportunities');
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Full API response:', data);
        
        if (data.status === 'success') {
            const opportunities = data.opportunities || [];
            console.log(`✅ Found ${opportunities.length} opportunities`);
            
            if (opportunities.length === 0) {
                console.log('📭 No opportunities found, generating new feed...');
                await generateNewFeed();
            } else {
                renderOpportunities(opportunities);
            }
        } else {
            console.error('❌ API returned error:', data.msg);
            throw new Error(data.msg || 'Failed to load opportunities');
        }
        
    } catch (error) {
        console.error('💥 Error in loadOpportunities:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Error Loading Opportunities</h3>
                <p>${error.message}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary" onclick="loadOpportunities()">Try Again</button>
                    <button class="btn btn-primary" onclick="generateNewFeed()" style="margin-left: 0.5rem;">
                        Generate New Feed
                    </button>
                </div>
            </div>
        `;
    }
}
function renderOpportunities(opportunities) {
    const container = document.getElementById('opportunities-container');
    if (!container) {
        console.error('❌ Container not found!');
        return;
    }
    
    console.log('🎨 Starting to render', opportunities.length, 'opportunities');
    
    if (!opportunities || opportunities.length === 0) {
        console.log('📭 No opportunities to render');
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Opportunities Available</h3>
                <p>No investment opportunities found in your feed.</p>
                <button class="btn btn-primary" onclick="refreshFeed()">Refresh Feed</button>
            </div>
        `;
        return;
    }
    
    try {
        // Clear container first
        container.innerHTML = '';
        
        // Render each opportunity individually to catch errors
        opportunities.forEach((opportunity, index) => {
            console.log(`🖼️ Rendering opportunity ${index + 1}:`, opportunity.title);
            
            try {
                const opportunityHTML = createOpportunityCard(opportunity);
                container.innerHTML += opportunityHTML;
            } catch (cardError) {
                console.error(`❌ Error rendering card ${index}:`, cardError);
                container.innerHTML += `
                    <div class="error-card">
                        <h3>Error displaying opportunity</h3>
                        <p>${opportunity.title || 'Unknown'}</p>
                    </div>
                `;
            }
        });
        
        console.log('✅ All opportunities rendered, setting up buttons...');
        setupDecisionButtons();
        
    } catch (error) {
        console.error('❌ Error in renderOpportunities:', error);
        throw error;
    }
}

function createOpportunityCard(opportunity) {
    // Safely get all values with fallbacks
    const title = opportunity.title || 'Untitled Pitch';
    const industry = opportunity.industry || 'Unknown Industry';
    const stage = opportunity.stage || 'Unknown Stage';
    const funding = opportunity.funding_amount || 'Funding not specified';
    const description = opportunity.elevator_pitch || opportunity.description || 'No description available.';
    const matchScore = opportunity.match_score || 50;
    const pitchId = opportunity._id || 'unknown';
    const entrepreneurId = opportunity.entrepreneur_id || '';
    
    // Safely get metrics
    const metrics = opportunity.metrics || {};
    const mrr = metrics.mrr || '$0';
    const users = metrics.users || '0';
    const employees = metrics.employees || '0';
    
    return `
        <div class="pitch-card" 
             data-opportunity-id="${pitchId}"
             data-pitch-id="${pitchId}"
             data-entrepreneur-id="${entrepreneurId}">
            
            <div class="pitch-header">
                <div>
                    <h3 class="pitch-title">${title}</h3>
                    <p class="pitch-category">${industry} • ${stage} • ${funding}</p>
                </div>
                <div class="pitch-match ${getMatchClass(matchScore)}">
                    ${getMatchIcon(matchScore)}
                    ${matchScore}% Match
                </div>
            </div>
            
            <p class="pitch-summary">${description}</p>
            
            <div class="pitch-metrics">
                <div class="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1V23" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${mrr}
                </div>
                
                <div class="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${users} Users
                </div>
                
                <div class="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${employees} Employees
                </div>
            </div>
            
            ${matchScore < 80 ? `
                <div class="ai-insights">
                    <div class="insight-item">
                        <div class="insight-title">AI Insight</div>
                        <div class="insight-text">${getAIInsight(opportunity)}</div>
                    </div>
                </div>
            ` : ''}
            
            <div class="decision-buttons">
                <button class="btn btn-yes" data-opportunity="${pitchId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Yes
                </button>
                <button class="btn btn-maybe" data-opportunity="${pitchId}">Maybe</button>
                <button class="btn btn-no" data-opportunity="${pitchId}">No</button>
            </div>
        </div>
    `;
}

function getAIInsight(opportunity) {
    if (opportunity.match_score < 70) {
        return "Consider requesting additional market validation and clearer differentiation from competitors.";
    } else if (opportunity.match_score < 80) {
        return "Strong potential but needs more traction metrics. Review team background carefully.";
    } else {
        return "Excellent match with your investment criteria. Strong team and market position.";
    }
}

function getMatchClass(score) {
    if (score >= 85) return 'match-high';
    if (score >= 75) return 'match-medium';
    return 'match-low';
}

function getMatchIcon(score) {
    if (score >= 85) {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16V12" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8H12.01" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
}

function setupDecisionButtons() {
    document.querySelectorAll('.decision-buttons .btn').forEach(button => {
        button.addEventListener('click', function() {
            const opportunityId = this.getAttribute('data-opportunity');
            const buttonText = this.textContent.trim().toLowerCase();
            const decisionMap = {
                'yes': 'matched',
                'maybe': 'maybe', 
                'no': 'rejected'
            };
            
            const decision = decisionMap[buttonText] || buttonText;
            console.log(`Clicked ${buttonText} -> ${decision} for opportunity ${opportunityId}`);
            makeDecision(opportunityId, decision, this);
        });
    });
}

async function makeDecision(opportunityId, decision, button) {
    try {
        console.log('📤 Making decision:', { opportunityId, decision });
        
        // Get the opportunity card to extract entrepreneur_id and pitch_id
        const card = button.closest('.pitch-card');
        if (!card) {
            throw new Error('Could not find opportunity card');
        }
        
        // Extract IDs from data attributes
        const entrepreneurId = card.dataset.entrepreneurId;
        const pitchId = card.dataset.pitchId || opportunityId;
        
        console.log('📊 IDs:', { pitchId, entrepreneurId });
        
        if (!entrepreneurId) {
            throw new Error('Entrepreneur ID not found');
        }
        
        if (!pitchId) {
            throw new Error('Pitch ID not found');
        }
        
        // Make the API call
        const response = await fetch('/api/investor/decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pitch_id: pitchId,
                entrepreneur_id: entrepreneurId,
                decision: decision
            })
        });
        
        // Check if response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Received non-JSON response:', text.substring(0, 500));
            throw new Error('Server returned an error page. Check API endpoint.');
        }
        
        const data = await response.json();
        console.log('📥 Response:', data);
        
        if (data.status === 'success') {
            showDecisionConfirmation(button, decision);
            
            // Remove the card after successful decision
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease-out';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    // Reload opportunities if none left
                    const remainingCards = document.querySelectorAll('.pitch-card');
                    if (remainingCards.length === 0) {
                        loadOpportunities();
                    }
                }, 300);
            }, 1000);
            
            loadAnalytics(); // Refresh analytics
        } else {
            throw new Error(data.msg || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ Error making decision:', error);
        showNotification('Error recording decision: ' + error.message, 'error');
    }
}

// Helper function to show visual confirmation
function showDecisionConfirmation(button, decision) {
    const originalText = button.textContent;
    const messages = {
        'matched': '✅ Matched!',
        'maybe': '🤔 Saved',
        'rejected': '❌ Passed'
    };
    
    button.textContent = messages[decision] || '✓ Done';
    button.style.backgroundColor = decision === 'matched' ? '#10b981' : 
                                   decision === 'maybe' ? '#f59e0b' : '#ef4444';
    button.disabled = true;
    
    // Disable other buttons in the same card
    const card = button.closest('.opportunity-card');
    if (card) {
        const allButtons = card.querySelectorAll('button');
        allButtons.forEach(btn => btn.disabled = true);
    }
}

// Example: Update your opportunity card rendering to include data attributes
function renderOpportunityCard(opportunity) {
    return `
        <div class="opportunity-card" 
             data-pitch-id="${opportunity.pitch_id}"
             data-entrepreneur-id="${opportunity.entrepreneur_id}">
            
            <div class="opportunity-header">
                <h3>${opportunity.title || 'Untitled Pitch'}</h3>
                <span class="match-score">${opportunity.match_score || 50}% Match</span>
            </div>
            
            <div class="opportunity-summary">
                <p>${opportunity.summary || 'No summary available'}</p>
            </div>
            
            <div class="opportunity-actions">
                <button class="btn-reject" 
                        onclick="makeDecision('${opportunity.pitch_id}', 'rejected', this)">
                    ❌ Pass
                </button>
                <button class="btn-maybe" 
                        onclick="makeDecision('${opportunity.pitch_id}', 'maybe', this)">
                    🤔 Maybe
                </button>
                <button class="btn-match" 
                        onclick="makeDecision('${opportunity.pitch_id}', 'matched', this)">
                    ✅ Match
                </button>
            </div>
        </div>
    `;
}

async function loadOpportunities() {
    const container = document.getElementById('opportunities-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading opportunities...</p>
        </div>
    `;
    
    try {
        console.log('🚀 Starting loadOpportunities...');
        
        const response = await fetch('/api/opportunities');
        console.log('📡 Response status:', response.status, response.statusText);
        
        // Check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Parse the response
        const data = await response.json();
        console.log('📦 Full API response:', data);
        
        if (data.status === 'success') {
            console.log('✅ Success - Opportunities:', data.opportunities);
            renderOpportunities(data.opportunities || []);
        } else {
            console.error('❌ API returned error:', data.msg);
            throw new Error(data.msg || 'Failed to load opportunities');
        }
        
    } catch (error) {
        console.error('💥 Error in loadOpportunities:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Error Loading Opportunities</h3>
                <p>${error.message}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary" onclick="loadOpportunities()">Try Again</button>
                    <button class="btn btn-primary" onclick="testAllEndpoints()" style="margin-left: 0.5rem;">
                        Test Endpoints
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadOpportunities();
    loadAnalytics();
});

function showDecisionConfirmation(button, decision) {
    const card = button.closest('.pitch-card');
    const buttons = card.querySelectorAll('.decision-buttons .btn');
    
    // Remove active state from all buttons
    buttons.forEach(btn => {
        btn.style.opacity = '0.7';
        btn.style.transform = 'scale(1)';
    });
    
    // Highlight the clicked button
    button.style.opacity = '1';
    button.style.transform = 'scale(1.05)';
    
    // Show confirmation message - FIXED: Use backend decision values
    let message = '';
    let bgColor = '';
    let textColor = '';
    
    // CORRECTED: Check for backend values, not frontend button text
    if (decision === 'matched') {
        message = '✅ Opportunity saved for further review!';
        bgColor = '#f0fdf4';
        textColor = '#059669';
    } else if (decision === 'maybe') {
        message = "🤔 We'll send you a summary for reconsideration.";
        bgColor = '#fffbeb';
        textColor = '#d97706';
    } else if (decision === 'rejected') {
        message = '❌ Opportunity declined.';
        bgColor = '#fef2f2';
        textColor = '#dc2626';
    } else {
        // Fallback for any unexpected values
        message = `Decision recorded: ${decision}`;
        bgColor = '#f3f4f6';
        textColor = '#374151';
    }
    
    let confirmation = card.querySelector('.confirmation-message');
    if (!confirmation) {
        confirmation = document.createElement('div');
        confirmation.className = 'confirmation-message';
        confirmation.style.marginTop = '12px';
        confirmation.style.padding = '8px 12px';
        confirmation.style.borderRadius = '6px';
        confirmation.style.fontSize = '13px';
        card.querySelector('.decision-buttons').after(confirmation);
    }
    
    confirmation.textContent = message;
    confirmation.style.background = bgColor;
    confirmation.style.color = textColor;
    
    console.log(`🎯 Showing confirmation for decision: ${decision}`);
}

async function loadPortfolio() {
    const container = document.getElementById('portfolio-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderPortfolio(data.portfolio);
        } else {
            container.innerHTML = '<p>Error loading portfolio</p>';
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
        container.innerHTML = '<p>Error loading portfolio</p>';
    }
}

function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-container');
    if (!container) return;
    
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Investments Yet</h3>
                <p>Your investment portfolio will appear here once you start making investments.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = portfolio.map(investment => `
        <div class="portfolio-card">
            <div class="portfolio-header">
                <h3>${investment.company_name}</h3>
                <div class="portfolio-status status-${investment.status.toLowerCase()}">${investment.status}</div>
            </div>
            <p>${investment.industry} • ${investment.stage}</p>
            <div class="portfolio-metrics">
                <span>Investment: ${investment.amount}</span>
                <span class="return ${investment.return >= 0 ? 'positive' : 'negative'}">
                    ${investment.return >= 0 ? '+' : ''}${investment.return}%
                </span>
            </div>
        </div>
    `).join('');
}

async function loadPreferences() {
    const container = document.getElementById('preferences-form');
    if (!container) return;
    
    try {
        const response = await fetch('/api/preferences-investor');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderPreferencesForm(data.preferences);
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

function renderPreferencesForm(preferences) {
    const container = document.getElementById('preferences-form');
    if (!container) return;
    
    container.innerHTML = `
        <form id="investor-preferences-form">
            <div class="form-group">
                <label class="form-label">Investment Focus Areas</label>
                <div class="checkbox-group">
                    ${['SaaS', 'Health Tech', 'FinTech', 'Consumer Goods', 'EdTech', 'Clean Tech'].map(area => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="focus_areas" value="${area}" 
                                ${(preferences.focus_areas || []).includes(area) ? 'checked' : ''}>
                            ${area}
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Investment Stage</label>
                    <select class="form-select" name="investment_stages" multiple>
                        ${['Pre-Seed ($50K - $250K)', 'Seed ($250K - $1M)', 'Series A ($1M - $5M)', 'Series B ($5M - $15M)', 'Series C+ ($15M+)'].map(stage => `
                            <option value="${stage}" ${(preferences.investment_stages || []).includes(stage) ? 'selected' : ''}>${stage}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Geographic Focus</label>
                    <select class="form-select" name="geographic_focus" multiple>
                        ${['North America', 'Europe', 'Asia', 'Latin America', 'Global'].map(region => `
                            <option value="${region}" ${(preferences.geographic_focus || []).includes(region) ? 'selected' : ''}>${region}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Team Criteria</label>
                <textarea class="form-textarea" name="team_criteria" placeholder="What qualities do you look for in founding teams?">${preferences.team_criteria || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Match Threshold: <span id="threshold-value">${preferences.match_threshold || 75}%</span></label>
                <input type="range" name="match_threshold" min="50" max="100" value="${preferences.match_threshold || 75}" 
                       class="threshold-slider">
                <p class="form-help">Only show opportunities above this match percentage</p>
            </div>
            
            <button type="submit" class="btn btn-primary">Save Preferences</button>
        </form>
    `;
    
    // Setup form submission
    const form = document.getElementById('investor-preferences-form');
    form.addEventListener('submit', handlePreferenceSubmit);
    
    // Setup threshold slider
    const slider = document.querySelector('.threshold-slider');
    const valueDisplay = document.getElementById('threshold-value');
    slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value + '%';
    });
}

async function handlePreferenceSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const preferences = {
        focus_areas: formData.getAll('focus_areas'),
        investment_stages: formData.getAll('investment_stages'),
        geographic_focus: formData.getAll('geographic_focus'),
        team_criteria: formData.get('team_criteria'),
        match_threshold: parseInt(formData.get('match_threshold'))
    };
    
    try {
        const response = await fetch('/api/preferences-investor', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preferences)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Preferences saved successfully!', 'success');
            loadOpportunities(); // Reload opportunities with new preferences
        } else {
            showNotification('Error saving preferences: ' + data.msg, 'error');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        showNotification('Error saving preferences. Please try again.', 'error');
    }
}
async function load_feed_from_vectordb() {
    try {
        const response = await fetch('/api/feed/generate');
        const result = await response.json();
        
        if (result.status === "success" && result.feed) {
            console.log('Feed loaded from vector database:', result.feed);
            renderOpportunities(result.feed.matches || []);
        } else {
            console.error('Error loading feed:', result.msg);
            renderOpportunities([]);
        }
    } catch (error) {
        console.error('Error fetching feed:', error);
        renderOpportunities([]);
    }
}

// For the refresh button
// For the refresh button - PROPER FALLBACK
document.getElementById('refresh-opportunities').addEventListener('click', async () => {
    const refreshBtn = document.getElementById('refresh-opportunities');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `
        <div class="loading-spinner small"></div>
        Refreshing Feed...
    `;
    
    try {
        console.log('🔄 Attempting to refresh existing feed...');
        
        // First try to refresh existing feed
        const refreshResponse = await fetch('/api/feed/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const refreshResult = await refreshResponse.json();
        console.log('📦 Refresh response:', refreshResult);
        
        if (refreshResult.status === "success") {
            console.log('✅ Feed refresh initiated:', refreshResult.msg);
            showNotification('Feed refresh initiated! New opportunities will appear shortly.', 'success');
            
            // Wait for refresh to process, then check if feed exists
            setTimeout(async () => {
                // Check if feed was actually created
                const checkResponse = await fetch('/api/opportunities');
                const checkData = await checkResponse.json();
                
                if (checkData.opportunities && checkData.opportunities.length > 0) {
                    console.log('✅ Feed created successfully with', checkData.opportunities.length, 'opportunities');
                    loadOpportunities();
                } else {
                    console.log('🔄 Refresh didnt create feed, generating new one...');
                    await generateNewFeed();
                }
            }, 2000);
            
        } else {
            // If refresh returns error, generate new feed
            console.log('🔄 Refresh returned error, generating new feed...');
            await generateNewFeed();
        }
        
    } catch (error) {
        console.error('❌ Error in refresh flow:', error);
        console.log('🔄 Refresh failed, generating new feed...');
        await generateNewFeed();
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 4V10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Refresh Feed
        `;
    }
});

// Helper function to generate new feed
async function generateNewFeed() {
    const container = document.getElementById('opportunities-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Generating personalized feed...</p>
        </div>
    `;
    
    try {
        console.log('🎯 Generating new feed...');
        const generateResponse = await fetch('/api/feed/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const generateResult = await generateResponse.json();
        console.log('📦 Generate response:', generateResult);
        
        if (generateResult.status === "success") {
            console.log('✅ New feed generated successfully');
            showNotification('Personalized feed generated! Loading opportunities...', 'success');
            
            // Wait for generation to complete and reload opportunities
            setTimeout(() => {
                loadOpportunities();
            }, 3000);
            
        } else {
            console.error('❌ Error generating feed:', generateResult.msg);
            showNotification('Error generating feed: ' + generateResult.msg, 'error');
            container.innerHTML = `
                <div class="error-state">
                    <h3>Feed Generation Failed</h3>
                    <p>${generateResult.msg}</p>
                    <button class="btn btn-primary" onclick="generateNewFeed()">Try Again</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error generating new feed:', error);
        showNotification('Error generating feed. Please try again.', 'error');
        container.innerHTML = `
            <div class="error-state">
                <h3>Network Error</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="generateNewFeed()">Try Again</button>
            </div>
        `;
    }
}

async function loadAnalytics() {
    const container = document.getElementById('analytics-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/analytics/investor');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderAnalytics(data.analytics);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function renderAnalytics(analytics) {
    const container = document.getElementById('analytics-container');
    if (!container) return;
    
    // Ensure we have valid data
    const safeAnalytics = {
        opportunities_reviewed: analytics?.opportunities_reviewed || 0,
        pitches_saved: analytics?.pitches_saved || 0,
        active_investments: analytics?.active_investments || 0,
        avg_match_rate: analytics?.avg_match_rate || 0
    };
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${safeAnalytics.opportunities_reviewed}</div>
            <div class="stat-label">Opportunities Reviewed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${safeAnalytics.pitches_saved}</div>
            <div class="stat-label">Pitches Saved</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${safeAnalytics.active_investments}</div> 
            <div class="stat-label">Active Investments</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${safeAnalytics.avg_match_rate}%</div>
            <div class="stat-label">Avg. Match Rate</div>
        </div>
    `;
}
async function loadSummaries() {
    const container = document.getElementById('summaries-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/summaries');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderSummaries(data.summaries);
        } else {
            container.innerHTML = '<p>No summaries available</p>';
        }
    } catch (error) {
        console.error('Error loading summaries:', error);
        container.innerHTML = '<p>Error loading summaries</p>';
    }
}

function renderSummaries(summaries) {
    const container = document.getElementById('summaries-container');
    if (!container) return;
    
    if (!summaries || summaries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Summaries Available</h3>
                <p>Your pitch summaries will appear here once you start reviewing opportunities.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = summaries.map(summary => {
        // Safe date handling
        let displayDate = 'Unknown Date';
        try {
            const dateObj = new Date(summary.created_at);
            if (!isNaN(dateObj.getTime())) {
                displayDate = dateObj.toLocaleDateString();
            }
        } catch (e) {
            console.warn('Invalid date:', summary.created_at);
        }
        
        return `
        <div class="summary-card">
            <div class="summary-header">
                <h3>${summary.pitch_title || 'Untitled Pitch'}</h3>
                <span class="summary-date">${displayDate}</span>
            </div>
            <div class="summary-content">
                <p><strong>Decision:</strong> <span class="decision-${summary.decision}">${summary.decision}</span></p>
                <p><strong>Summary:</strong> ${summary.summary || summary.content || 'No summary available.'}</p>
                ${summary.notes ? `<p><strong>Notes:</strong> ${summary.notes}</p>` : ''}
                ${summary.pitch_id ? `<p><small>Pitch ID: ${summary.pitch_id}</small></p>` : ''}
            </div>
            <div class="summary-actions">
                <button class="btn btn-secondary" onclick="reviewSummary('${summary.pitch_id}')">Review Again</button>
                <button class="btn btn-outline" onclick="deleteSummary('${summary._id}')">Remove</button>
            </div>
        </div>
        `;
    }).join('');
}
async function reviewSummary(pitchId) {
    console.log('🔍 Reviewing summary for pitch:', pitchId);
    showNotification('Loading pitch details...', 'info');
    
    try {
        // Use the new investor-specific endpoint
        const response = await fetch(`/api/investor/pitches/${pitchId}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Please log in as investor to view pitch details');
            } else if (response.status === 404) {
                throw new Error('Pitch not found or no longer available');
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.pitch) {
            console.log('✅ Pitch details loaded:', data.pitch);
            displayPitchModal(data.pitch);
        } else {
            throw new Error(data.msg || 'Failed to load pitch details');
        }
        
    } catch (error) {
        console.error('❌ Error fetching pitch:', error);
        showNotification('Error: ' + error.message, 'error');
        
        // Enhanced fallback with better error handling
        await tryFindPitchInOpportunities(pitchId);
    }
}

// Enhanced fallback function
async function tryFindPitchInOpportunities(pitchId) {
    try {
        console.log('🔄 Searching for pitch in current opportunities...');
        
        const response = await fetch('/api/opportunities');
        const data = await response.json();
        
        if (data.status === 'success' && data.opportunities) {
            const pitch = data.opportunities.find(opp => 
                opp._id === pitchId || 
                opp.pitch_id === pitchId ||
                (opp._id && opp._id.toString() === pitchId)
            );
            
            if (pitch) {
                console.log('✅ Found pitch in opportunities:', pitch.title);
                // Enhance the pitch object with missing fields
                const enhancedPitch = {
                    _id: pitchId,
                    title: pitch.title || 'Pitch from Opportunities',
                    description: pitch.elevator_pitch || pitch.description || 'Description from opportunity feed.',
                    industry: pitch.industry || 'Unknown',
                    stage: pitch.stage || 'Unknown',
                    funding_amount: pitch.funding_amount || 'Not specified',
                    metrics: pitch.metrics || {
                        mrr: 'N/A',
                        users: 'N/A', 
                        employees: 'N/A'
                    }
                };
                displayPitchModal(enhancedPitch);
                showNotification('Pitch found in current opportunities', 'success');
            } else {
                // Create a basic pitch object from summary data
                showBasicPitchInfo(pitchId);
            }
        } else {
            showBasicPitchInfo(pitchId);
        }
        
    } catch (error) {
        console.error('❌ Error in fallback search:', error);
        showBasicPitchInfo(pitchId);
    }
}

function showBasicPitchInfo(pitchId) {
    const minimalPitch = {
        _id: pitchId,
        title: 'Pitch Under Review',
        description: `You previously marked this pitch for later review. The full details are not currently available in the opportunity feed.\n\nPitch ID: ${pitchId}`,
        industry: 'Previously Reviewed',
        stage: 'Under Consideration',
        funding_amount: 'Review required',
        metrics: {
            mrr: 'Data needed',
            users: 'Data needed',
            employees: 'Data needed'
        }
    };
    displayPitchModal(minimalPitch);
    showNotification('Showing limited information - pitch marked for review', 'info');
}
// Function to display pitch in a modal
function displayPitchModal(pitch) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeButton.onclick = () => document.body.removeChild(modalOverlay);
    
    // Create pitch content
    const pitchHTML = `
        <div class="pitch-details">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">${pitch.title || 'Untitled Pitch'}</h2>
            
            <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
                <span class="pitch-tag">${pitch.industry || 'Unknown Industry'}</span>
                <span class="pitch-tag">${pitch.stage || 'Unknown Stage'}</span>
                <span class="pitch-tag">${pitch.funding_amount || 'Funding not specified'}</span>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #374151;">Description</h4>
                <p style="margin: 0; line-height: 1.6; color: #6b7280;">
                    ${pitch.description || pitch.elevator_pitch || 'No description available.'}
                </p>
            </div>
            
            ${pitch.metrics ? `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px 0; color: #374151;">Key Metrics</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                    ${pitch.metrics.mrr ? `
                        <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-weight: 600; color: #1f2937;">MRR</div>
                            <div style="color: #059669; font-size: 18px; font-weight: 600;">${pitch.metrics.mrr}</div>
                        </div>
                    ` : ''}
                    
                    ${pitch.metrics.users ? `
                        <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-weight: 600; color: #1f2937;">Users</div>
                            <div style="color: #3b82f6; font-size: 18px; font-weight: 600;">${pitch.metrics.users}</div>
                        </div>
                    ` : ''}
                    
                    ${pitch.metrics.employees ? `
                        <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-weight: 600; color: #1f2937;">Team</div>
                            <div style="color: #8b5cf6; font-size: 18px; font-weight: 600;">${pitch.metrics.employees}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-primary" onclick="reconsiderPitch('${pitch._id || pitch.pitch_id}')">
                    Reconsider Pitch
                </button>
                <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal-overlay'))">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modalContent.innerHTML = pitchHTML;
    modalContent.appendChild(closeButton);
    modalOverlay.appendChild(modalContent);
    
    // Close modal when clicking outside
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    };
    
    document.body.appendChild(modalOverlay);
}

// Function to reconsider a pitch (move it back to opportunities)
async function reconsiderPitch(pitchId) {
    try {
        console.log('🔄 Reconsidering pitch:', pitchId);
        
        const response = await fetch('/api/summaries/reconsider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pitch_id: pitchId
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Pitch moved back to opportunities!', 'success');
            // Close modal
            document.querySelector('.modal-overlay')?.remove();
            // Reload summaries and opportunities
            loadSummaries();
            loadOpportunities();
        } else {
            throw new Error(data.msg || 'Failed to reconsider pitch');
        }
        
    } catch (error) {
        console.error('❌ Error reconsidering pitch:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

async function deleteSummary(summaryId) {
    if (!confirm('Are you sure you want to remove this summary? This action cannot be undone.')) {
        return;
    }
    
    console.log('🗑️ Deleting summary:', summaryId);
    
    try {
        const response = await fetch(`/api/summaries/${summaryId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Summary removed successfully', 'success');
            // Reload the summaries
            loadSummaries();
        } else {
            throw new Error(data.msg || 'Failed to delete summary');
        }
        
    } catch (error) {
        console.error('❌ Error deleting summary:', error);
        showNotification('Error deleting summary: ' + error.message, 'error');
    }
}
function refreshOpportunities() {
    const refreshBtn = document.getElementById('refresh-opportunities');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `
        <div class="loading-spinner small"></div>
        Refreshing...
    `;
    
    loadOpportunities().finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 4V10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Refresh Opportunities
        `;
    });
}

function resetFilters() {
    document.getElementById('industry-filter').value = '';
    document.getElementById('stage-filter').value = '';
    document.getElementById('sort-filter').value = 'match_score';
    loadOpportunities();
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#059669';
    } else {
        notification.style.background = '#dc2626';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Logout functionality
document.querySelector('.login-btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to log out?')) {
        window.location.href = '/logout';
    }
});

// Final investor dashboard presentation overrides.
function safeText(value, fallback = '') {
    return String(value ?? fallback)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function createOpportunityCard(opportunity) {
    const title = safeText(opportunity.title, 'Untitled Pitch');
    const industry = safeText(opportunity.industry, 'Unknown Industry');
    const stage = safeText(opportunity.stage, 'Unknown Stage');
    const funding = safeText(opportunity.funding_amount, 'Funding not specified');
    const description = safeText(opportunity.elevator_pitch || opportunity.description, 'No description available.');
    const matchScore = Number(opportunity.match_score || 50);
    const pitchId = safeText(opportunity._id || opportunity.pitch_id || 'unknown');
    const entrepreneurId = safeText(opportunity.entrepreneur_id || '');
    const metrics = opportunity.metrics || {};

    return `
        <div class="pitch-card" data-opportunity-id="${pitchId}" data-pitch-id="${pitchId}" data-entrepreneur-id="${entrepreneurId}">
            <div class="pitch-header">
                <div>
                    <h3 class="pitch-title">${title}</h3>
                    <p class="pitch-category">${industry} &bull; ${stage} &bull; ${funding}</p>
                </div>
                <div class="pitch-match ${getMatchClass(matchScore)}">${matchScore}% fit</div>
            </div>

            <p class="pitch-summary">${description}</p>

            <div class="pitch-metrics" aria-label="Opportunity metrics">
                <div class="metric"><strong>${safeText(metrics.mrr, '$0')}</strong><span> MRR</span></div>
                <div class="metric"><strong>${safeText(metrics.users, '0')}</strong><span> users</span></div>
                <div class="metric"><strong>${safeText(metrics.employees, '0')}</strong><span> team</span></div>
            </div>

            <div class="ai-insights">
                <div class="insight-item">
                    <div class="insight-title">AI read</div>
                    <div class="insight-text">${safeText(getAIInsight(opportunity))}</div>
                </div>
            </div>

            <div class="decision-buttons">
                <button class="btn btn-yes" data-opportunity="${pitchId}">Yes</button>
                <button class="btn btn-maybe" data-opportunity="${pitchId}">Maybe</button>
                <button class="btn btn-no" data-opportunity="${pitchId}">No</button>
            </div>
        </div>
    `;
}

function renderAnalytics(analytics) {
    const container = document.getElementById('analytics-container');
    if (!container) return;

    const safeAnalytics = {
        opportunities_reviewed: analytics?.opportunities_reviewed || 0,
        pitches_saved: analytics?.pitches_saved || 0,
        active_investments: analytics?.active_investments || 0,
        avg_match_rate: analytics?.avg_match_rate || 0
    };

    container.innerHTML = `
        <div class="stat-card"><div class="stat-value">${safeAnalytics.opportunities_reviewed}</div><div class="stat-label">Reviewed decisions</div></div>
        <div class="stat-card"><div class="stat-value">${safeAnalytics.pitches_saved}</div><div class="stat-label">Saved opportunities</div></div>
        <div class="stat-card"><div class="stat-value">${safeAnalytics.active_investments}</div><div class="stat-label">Active portfolio</div></div>
        <div class="stat-card"><div class="stat-value">${safeAnalytics.avg_match_rate}%</div><div class="stat-label">Average fit score</div></div>
    `;
}

function renderPreferencesForm(preferences = {}) {
    const container = document.getElementById('preferences-form');
    if (!container) return;

    const focusAreas = preferences.focus_areas || [];
    const stages = preferences.investment_stages || [];
    const regions = preferences.geographic_focus || [];
    const threshold = preferences.match_threshold || 75;

    const choice = (name, value, selected) => `
        <label class="choice-card">
            <input type="checkbox" name="${name}" value="${safeText(value)}" ${selected ? 'checked' : ''}>
            <span>${safeText(value)}</span>
        </label>
    `;

    container.innerHTML = `
        <form id="investor-preferences-form" class="preference-shell">
            <div class="preference-panel">
                <div class="preference-block">
                    <h3>Focus areas</h3>
                    <p>Pick the categories you actively want the feed to prioritize.</p>
                    <div class="choice-grid">
                        ${['SaaS', 'Health Tech', 'FinTech', 'Consumer Goods', 'EdTech', 'Clean Tech'].map(area => choice('focus_areas', area, focusAreas.includes(area))).join('')}
                    </div>
                </div>

                <div class="preference-block">
                    <h3>Investment stage</h3>
                    <p>Choose the funding stages that match your cheque size and risk appetite.</p>
                    <div class="choice-grid">
                        ${['Pre-Seed ($50K - $250K)', 'Seed ($250K - $1M)', 'Series A ($1M - $5M)', 'Series B ($5M - $15M)', 'Series C+ ($15M+)'].map(stage => choice('investment_stages', stage, stages.includes(stage))).join('')}
                    </div>
                </div>

                <div class="preference-block">
                    <h3>Geography</h3>
                    <p>Tell BidMind where you prefer companies to operate.</p>
                    <div class="choice-grid">
                        ${['North America', 'Europe', 'Asia', 'Latin America', 'Global'].map(region => choice('geographic_focus', region, regions.includes(region))).join('')}
                    </div>
                </div>

                <div class="preference-block">
                    <h3>Team criteria</h3>
                    <p>Describe founder signals, domain expertise, or traction proof you care about.</p>
                    <textarea class="form-textarea" name="team_criteria" placeholder="Example: technical founder, strong domain expertise, early revenue, clear distribution advantage">${safeText(preferences.team_criteria || '')}</textarea>
                </div>
            </div>

            <aside class="preference-sidecar">
                <h3>Matching strictness</h3>
                <p>This threshold controls how selective the opportunity feed should feel.</p>
                <div class="threshold-readout">
                    <strong id="threshold-value">${threshold}%</strong>
                    <span>minimum fit</span>
                </div>
                <input type="range" name="match_threshold" min="50" max="100" value="${threshold}" class="threshold-slider">
                <p>Higher values produce fewer, tighter matches. Lower values broaden discovery.</p>
                <button type="submit" class="btn btn-primary save-preferences" style="width:100%;">Save Preferences</button>
            </aside>
        </form>
    `;

    const form = document.getElementById('investor-preferences-form');
    form.addEventListener('submit', handlePreferenceSubmit);

    const slider = document.querySelector('.threshold-slider');
    const valueDisplay = document.getElementById('threshold-value');
    slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value + '%';
    });
}

async function reconsiderPitch(pitchId) {
    const activeSummary = [...document.querySelectorAll('.summary-card')].find(card => card.textContent.includes(pitchId));
    if (activeSummary) activeSummary.classList.add('is-moving');

    try {
        const response = await fetch('/api/summaries/reconsider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pitch_id: pitchId })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showNotification('Moved back to Opportunities. It was removed from Summaries so you can review it again.', 'success');
            document.querySelector('.modal-overlay')?.remove();
            loadSummaries();
            loadOpportunities();

            const opportunitiesNav = document.querySelector('[data-section="opportunities"]');
            if (opportunitiesNav) opportunitiesNav.click();
        } else {
            throw new Error(data.msg || 'Failed to reconsider pitch');
        }
    } catch (error) {
        if (activeSummary) activeSummary.classList.remove('is-moving');
        console.error('Error reconsidering pitch:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Handle investor decisions (like/maybe/reject buttons)
async function handleInvestorDecision(entrepreneurId, pitchId, decision) {
    try {
        const response = await fetch('/api/investor/decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                entrepreneur_id: entrepreneurId,
                pitch_id: pitchId,
                decision: decision
            })
        });
        
        const result = await response.json();
        
        if (result.status === "success") {
            showNotification(`Opportunity ${decision} successfully!`, 'success');
            // Remove the card from UI or update its status
            updateOpportunityCard(pitchId, decision);
        } else {
            showNotification(`Error: ${result.msg}`, 'error');
        }
    } catch (error) {
        console.error('Error processing decision:', error);
        showNotification('Error processing decision', 'error');
    }
}

// Example button handlers 
function attachDecisionHandlers() {
    // Like button
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const entrepreneurId = this.dataset.entrepreneurId;
            const pitchId = this.dataset.pitchId;
            handleInvestorDecision(entrepreneurId, pitchId, 'matched');
        });
    });
    
    // Maybe button  
    document.querySelectorAll('.maybe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const entrepreneurId = this.dataset.entrepreneurId;
            const pitchId = this.dataset.pitchId;
            handleInvestorDecision(entrepreneurId, pitchId, 'maybe');
        });
    });
    
    // Reject button
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const entrepreneurId = this.dataset.entrepreneurId;
            const pitchId = this.dataset.pitchId;
            handleInvestorDecision(entrepreneurId, pitchId, 'rejected');
        });
    });
}

// Portfolio and decision-history overrides. These use existing decision records,
// so Yes/Maybe/No activity fills the previously empty dashboard panels.
async function loadAnalytics() {
    const container = document.getElementById('analytics-container');
    if (!container) return;

    try {
        const response = await fetch('/api/analytics/investor');
        const data = await response.json();

        if (data.status === 'success') {
            renderAnalytics(data.analytics);
            loadDecisionHistory();
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function renderPortfolioLegacy(portfolio) {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Portfolio Items Yet</h3>
                <p>When you press Yes on an opportunity, it will appear here as an active tracked pitch.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = portfolio.map(investment => `
        <div class="portfolio-card">
            <div class="portfolio-header">
                <div>
                    <h3>${safeText(investment.company_name || 'Matched Pitch')}</h3>
                    <p>${safeText(investment.industry || 'Unknown')} &bull; ${safeText(investment.stage || 'Unknown')}</p>
                </div>
                <div class="portfolio-status status-${String(investment.status || 'active').toLowerCase()}">${safeText(investment.status || 'Active')}</div>
            </div>
            <div class="portfolio-metrics">
                <div>
                    <span>Funding Interest</span>
                    <strong>${safeText(investment.amount || 'Not specified')}</strong>
                </div>
                <div>
                    <span>Status</span>
                    <strong>${investment.return ? `${investment.return}%` : 'Tracking'}</strong>
                </div>
            </div>
            <div class="summary-actions">
                <button class="btn btn-outline" onclick="reviewSummary('${safeText(investment.pitch_id || '')}')">View Pitch</button>
                <button class="btn btn-primary" type="button">Contact</button>
            </div>
        </div>
    `).join('');
}

async function loadDecisionHistory() {
    const decisionChart = document.getElementById('decision-chart');
    const performanceChart = document.getElementById('performance-chart');
    if (!decisionChart && !performanceChart) return;

    try {
        const response = await fetch('/api/decisions');
        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(data.msg || 'Failed to load decision history');
        }

        const counts = data.counts || { matched: 0, maybe: 0, rejected: 0 };
        const total = Math.max(1, counts.matched + counts.maybe + counts.rejected);

        if (decisionChart) {
            decisionChart.innerHTML = `
                <div class="decision-bars">
                    ${renderDecisionBar('Yes', counts.matched, total, 'matched')}
                    ${renderDecisionBar('Maybe', counts.maybe, total, 'maybe')}
                    ${renderDecisionBar('No', counts.rejected, total, 'rejected')}
                </div>
            `;
        }

        if (performanceChart) {
            const recent = data.decisions || [];
            performanceChart.innerHTML = recent.length ? `
                <div class="decision-list">
                    ${recent.map(item => `
                        <button class="decision-row" type="button" onclick="reviewSummary('${safeText(item.pitch_id)}')">
                            <div>
                                <strong>${safeText(item.pitch_title)}</strong>
                                <span>${safeText(item.industry)} &bull; ${safeText(item.stage)}</span>
                            </div>
                            <span class="decision-pill decision-${safeText(item.decision)}">${formatDecision(item.decision)}</span>
                        </button>
                    `).join('')}
                </div>
            ` : '<div class="empty-state"><p>Recent decisions appear here after you choose Yes, Maybe, or No on opportunities.</p></div>';
        }
    } catch (error) {
        console.error('Error loading decision history:', error);
        if (decisionChart) decisionChart.innerHTML = '<div class="error-state">Decision history could not be loaded.</div>';
    }
}

// More complete live-data portfolio renderer. This mirrors the demo page,
// but every number is derived from portfolio/pitch/decision data or shown as unavailable.
let latestPortfolioActivity = [];

function hasNumericPortfolioValue(value) {
    return parsePortfolioMoney(value) > 0;
}

function explicitPortfolioValue(item) {
    return parsePortfolioMoney(item.current_value || item.valuation || item.exit_value || item.market_value);
}

function explicitPortfolioReturn(item) {
    const value = item.return ?? item.roi ?? item.performance_return;
    const number = Number(value);
    return Number.isFinite(number) && number !== 0 ? number : null;
}

function realPortfolioStats(items) {
    const committed = items.reduce((sum, item) => sum + parsePortfolioMoney(item.amount || item.funding_goal), 0);
    const explicitValue = items.reduce((sum, item) => sum + explicitPortfolioValue(item), 0);
    const monthlyRevenue = items.reduce((sum, item) => sum + parsePortfolioMoney(item.monthly_revenue), 0);
    const active = items.filter(item => normalizePortfolioStatus(item.status) === 'active').length;
    const pending = items.filter(item => normalizePortfolioStatus(item.status) === 'pending').length;
    const returns = items.map(explicitPortfolioReturn).filter(value => value !== null);
    const avgReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : null;
    const impliedReturn = committed && explicitValue ? ((explicitValue - committed) / committed) * 100 : null;
    const avgGrowth = items
        .map(item => Number(item.growth_rate))
        .filter(value => Number.isFinite(value));

    return {
        committed,
        explicitValue,
        monthlyRevenue,
        active,
        pending,
        avgReturn,
        impliedReturn,
        avgGrowth: avgGrowth.length ? avgGrowth.reduce((sum, value) => sum + value, 0) / avgGrowth.length : null,
        hasReturns: returns.length > 0,
        hasExplicitValue: explicitValue > 0
    };
}

function displayPercent(value) {
    return value === null || value === undefined || !Number.isFinite(value) ? 'Not available' : `${value.toFixed(1)}%`;
}

function renderPortfolioValueChart(items, stats) {
    const sourceItems = items
        .map(item => ({
            name: item.company_name || 'Matched Pitch',
            committed: parsePortfolioMoney(item.amount || item.funding_goal),
            value: explicitPortfolioValue(item),
            revenue: parsePortfolioMoney(item.monthly_revenue)
        }))
        .filter(item => item.committed || item.value || item.revenue)
        .slice(0, 8);

    if (!sourceItems.length) {
        return '<div class="chart-empty">No numeric funding, valuation, or revenue fields saved yet.</div>';
    }

    const maxValue = Math.max(...sourceItems.map(item => item.value || item.committed || item.revenue), 1);
    return sourceItems.map(item => {
        const mainValue = item.value || item.committed || item.revenue;
        const width = Math.max(8, Math.round((mainValue / maxValue) * 100));
        const label = item.value ? 'valuation' : item.committed ? 'funding' : 'MRR';
        return `
            <div class="portfolio-chart-row">
                <span>${safeText(item.name)}</span>
                <div><i style="width:${width}%"></i></div>
                <strong>${formatPortfolioMoney(mainValue)} ${label}</strong>
            </div>
        `;
    }).join('');
}

function renderPortfolioBenchmark(stats) {
    const lines = [
        { label: 'Explicit portfolio value', value: stats.hasExplicitValue ? formatPortfolioMoney(stats.explicitValue) : 'Not available' },
        { label: 'Committed funding interest', value: formatPortfolioMoney(stats.committed) },
        { label: 'Monthly revenue tracked', value: stats.monthlyRevenue ? formatPortfolioMoney(stats.monthlyRevenue) : 'Not available' },
        { label: 'Average explicit ROI', value: displayPercent(stats.avgReturn) },
        { label: 'Value-based ROI', value: displayPercent(stats.impliedReturn) }
    ];

    return lines.map(item => `
        <div class="benchmark-row">
            <span>${safeText(item.label)}</span>
            <strong>${safeText(item.value)}</strong>
        </div>
    `).join('');
}

function renderPortfolioDetailStack(items) {
    const rows = [
        ['Monthly Revenue', 'monthly_revenue', formatPortfolioMoney],
        ['Funding Goal', 'funding_goal', formatPortfolioMoney],
        ['CAC', 'cac', formatPortfolioMoney],
        ['LTV', 'ltv', formatPortfolioMoney],
        ['Growth Rate', 'growth_rate', value => `${value}%`],
        ['Burn Rate', 'burn_rate', formatPortfolioMoney],
        ['Runway', 'runway', value => `${value} months`]
    ];

    const filled = rows.map(([label, key, formatter]) => {
        const count = items.filter(item => item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '').length;
        return { label, count, formatter };
    });

    return filled.map(item => `
        <div class="breakdown-item">
            <div class="breakdown-info">
                <div class="breakdown-color" style="background:${item.count ? '#059669' : '#cbd5e1'};"></div>
                <span class="breakdown-name">${item.label}</span>
            </div>
            <span class="breakdown-value">${item.count}/${items.length}</span>
        </div>
    `).join('');
}

function renderLiveInvestmentCard(investment) {
    const status = normalizePortfolioStatus(investment.status || investment.pitch_status);
    const explicitValue = explicitPortfolioValue(investment);
    const committed = parsePortfolioMoney(investment.amount || investment.funding_goal);
    const returnValue = explicitPortfolioReturn(investment);
    const pitchId = safeText(investment.pitch_id || '');
    const topMetrics = [
        `${formatPortfolioMoney(investment.monthly_revenue)} MRR`,
        `${safeText(investment.users || 'Not provided')} users`,
        `${safeText(investment.employees || 'Not provided')} team`
    ];

    return `
        <div class="investment-card" data-status="${status}">
            <div class="investment-header">
                <div>
                    <h3 class="investment-title">${safeText(investment.company_name || 'Matched Pitch')}</h3>
                    <p class="investment-category">${safeText(investment.industry || 'Unknown Industry')} &bull; ${safeText(investment.stage || 'Unknown Stage')}</p>
                </div>
                <div class="investment-status status-${status}">${safeText(status[0].toUpperCase() + status.slice(1))}</div>
            </div>
            <div class="investment-metrics">
                ${topMetrics.map(metric => `<div class="metric">${metric}</div>`).join('')}
            </div>
            <div class="portfolio-mini-grid">
                <div><span>Funding</span><strong>${formatPortfolioMoney(committed)}</strong></div>
                <div><span>Valuation</span><strong>${explicitValue ? formatPortfolioMoney(explicitValue) : 'Not available'}</strong></div>
                <div><span>CAC / LTV</span><strong>${hasNumericPortfolioValue(investment.cac) || hasNumericPortfolioValue(investment.ltv) ? `${formatPortfolioMoney(investment.cac)} / ${formatPortfolioMoney(investment.ltv)}` : 'Not available'}</strong></div>
                <div><span>Runway</span><strong>${investment.runway ? `${safeText(investment.runway)} months` : 'Not available'}</strong></div>
            </div>
            <div class="investment-performance">
                <div>
                    <div class="portfolio-muted">${explicitValue ? 'Current Value' : 'Funding Interest'}</div>
                    <div class="performance-value">${explicitValue ? formatPortfolioMoney(explicitValue) : formatPortfolioMoney(committed)}</div>
                </div>
                <div class="performance-change ${returnValue === null || returnValue >= 0 ? 'change-positive' : 'change-negative'}">${returnValue === null ? 'ROI unavailable' : `${returnValue > 0 ? '+' : ''}${returnValue}%`}</div>
            </div>
            <div class="investment-actions">
                <button class="btn btn-outline" type="button" onclick="reviewSummary('${pitchId}')">View Details</button>
                <button class="btn btn-outline" type="button">Update</button>
                <button class="btn btn-primary" type="button">Contact</button>
            </div>
        </div>
    `;
}

function renderLivePortfolioActivity(items, activity = latestPortfolioActivity) {
    const activityItems = activity.length ? activity : items.map(item => ({
        type: 'matched',
        company_name: item.company_name,
        amount: item.amount || item.funding_goal,
        timestamp: item.investment_date,
        pitch_id: item.pitch_id
    }));

    if (!activityItems.length) {
        return '<div class="empty-state"><p>Recent portfolio activity appears after you make investor decisions.</p></div>';
    }

    const labels = {
        matched: 'Added to portfolio',
        maybe: 'Saved for later review',
        rejected: 'Passed on pitch'
    };

    return activityItems.slice(0, 8).map(item => {
        const type = item.type || item.decision || 'matched';
        const isMatched = type === 'matched';
        return `
            <button class="activity-item activity-button" type="button" onclick="reviewSummary('${safeText(item.pitch_id || '')}')">
                <div class="activity-info">
                    <div class="activity-icon ${isMatched ? 'activity-positive' : ''}">${isMatched ? '$' : formatDecision(type).charAt(0)}</div>
                    <div class="activity-details">
                        <div class="activity-title">${safeText(labels[type] || 'Investor decision')}: ${safeText(item.company_name || 'Unknown Pitch')}</div>
                        <div class="activity-date">${portfolioDate(item.timestamp)}</div>
                    </div>
                </div>
                <div class="activity-amount">${isMatched ? formatPortfolioMoney(item.amount) : formatDecision(type)}</div>
            </button>
        `;
    }).join('');
}

async function loadPortfolio() {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    container.className = 'portfolio-workspace';
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading portfolio...</p></div>';

    try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();

        if (data.status === 'success') {
            latestPortfolioActivity = data.activity || [];
            renderPortfolio(data.portfolio || []);
        } else {
            throw new Error(data.msg || 'Failed to load portfolio');
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
        container.innerHTML = '<div class="error-state">Error loading portfolio</div>';
    }
}

function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    const items = Array.isArray(portfolio) ? portfolio : [];
    container.className = 'portfolio-workspace';

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Portfolio Items Yet</h3>
                <p>When you press Yes on an opportunity, the full portfolio dashboard fills with real pitch and decision data.</p>
            </div>
        `;
        return;
    }

    const stats = realPortfolioStats(items);
    const sortedItems = getSortedPortfolio([...items]);

    container.innerHTML = `
        <div class="portfolio-overview">
            <div class="overview-card">
                <div class="overview-value">${stats.hasExplicitValue ? formatPortfolioMoney(stats.explicitValue) : 'Not available'}</div>
                <div class="overview-label">Total Portfolio Value</div>
                <div class="overview-change ${stats.impliedReturn === null || stats.impliedReturn >= 0 ? 'change-positive' : 'change-negative'}">${stats.impliedReturn === null ? 'Add valuation/current value to show ROI' : `${stats.impliedReturn.toFixed(1)}% from committed capital`}</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${formatPortfolioMoney(stats.committed)}</div>
                <div class="overview-label">Invested / Interested Capital</div>
                <div class="overview-change change-positive">${items.length} Yes decision${items.length === 1 ? '' : 's'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${stats.active}</div>
                <div class="overview-label">Active Investments</div>
                <div class="overview-change change-positive">${stats.pending} pending</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${displayPercent(stats.avgReturn)}</div>
                <div class="overview-label">Average ROI</div>
                <div class="overview-change ${stats.avgGrowth === null || stats.avgGrowth >= 0 ? 'change-positive' : 'change-negative'}">${stats.avgGrowth === null ? 'Growth data not saved yet' : `${stats.avgGrowth.toFixed(1)}% avg growth signal`}</div>
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header">
                <h2>Portfolio Performance</h2>
                <div class="filter-bar">
                    <select class="filter-select" disabled>
                        <option>Live saved data</option>
                    </select>
                </div>
            </div>
            <div class="performance-grid">
                <div class="performance-card">
                    <div class="performance-header"><h3 class="performance-title">Portfolio Value Over Time</h3></div>
                    <div class="portfolio-chart">${renderPortfolioValueChart(items, stats)}</div>
                    <div class="portfolio-card-foot">
                        <span>Initial: ${formatPortfolioMoney(stats.committed)}</span>
                        <span>Current: ${stats.hasExplicitValue ? formatPortfolioMoney(stats.explicitValue) : 'Not available'}</span>
                    </div>
                </div>
                <div class="performance-card">
                    <div class="performance-header"><h3 class="performance-title">Performance vs Saved Metrics</h3></div>
                    <div class="benchmark-list">${renderPortfolioBenchmark(stats)}</div>
                </div>
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header"><h2>Portfolio Breakdown</h2></div>
            <div class="breakdown-grid">
                <div class="breakdown-card">
                    <h3>By Industry</h3>
                    ${renderBreakdownList(aggregatePortfolio(items, 'industry'))}
                </div>
                <div class="breakdown-card">
                    <h3>By Stage</h3>
                    ${renderBreakdownList(aggregatePortfolio(items, 'stage'))}
                </div>
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header"><h2>Portfolio Data Completeness</h2></div>
            <div class="breakdown-card">${renderPortfolioDetailStack(items)}</div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header">
                <h2>My Investments</h2>
                <div class="filter-bar">
                    <div class="filter-tabs" id="portfolio-filter-tabs">
                        ${['all', 'active', 'exited', 'pending'].map(filter => `<button class="filter-tab ${portfolioFilter === filter ? 'active' : ''}" type="button" data-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join('')}
                    </div>
                    <select class="filter-select" id="portfolio-sort">
                        <option value="recent" ${portfolioSort === 'recent' ? 'selected' : ''}>Sort by: Recent</option>
                        <option value="roi" ${portfolioSort === 'roi' ? 'selected' : ''}>Sort by: ROI</option>
                        <option value="size" ${portfolioSort === 'size' ? 'selected' : ''}>Sort by: Investment Size</option>
                    </select>
                </div>
            </div>
            <div class="investments-grid">
                ${sortedItems.length ? sortedItems.map(renderLiveInvestmentCard).join('') : '<div class="empty-state"><p>No investments match this filter.</p></div>'}
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header"><h2>Recent Activity</h2></div>
            <div class="activity-list">${renderLivePortfolioActivity(items)}</div>
        </div>
    `;

    container.querySelectorAll('#portfolio-filter-tabs .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            portfolioFilter = tab.dataset.filter;
            renderPortfolio(items);
        });
    });

    const sortSelect = container.querySelector('#portfolio-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', event => {
            portfolioSort = event.target.value;
            renderPortfolio(items);
        });
    }
}

function renderDecisionBar(label, value, total, type) {
    const width = Math.round((value / total) * 100);
    return `
        <div class="decision-bar-row">
            <div class="decision-bar-label"><span>${label}</span><strong>${value}</strong></div>
            <div class="decision-bar-track"><div class="decision-bar-fill decision-${type}" style="width:${width}%"></div></div>
        </div>
    `;
}

function formatDecision(decision) {
    if (decision === 'matched') return 'Yes';
    if (decision === 'maybe') return 'Maybe';
    if (decision === 'rejected') return 'No';
    return decision || 'Decision';
}

// Full pitch visibility overrides. AI copy can still help scanning, but the
// investor should always be able to open the complete founder-submitted pitch.
function createOpportunityCard(opportunity) {
    const title = safeText(opportunity.title, 'Untitled Pitch');
    const industry = safeText(opportunity.industry, 'Unknown Industry');
    const stage = safeText(opportunity.stage, 'Unknown Stage');
    const funding = safeText(opportunity.funding_amount, 'Funding not specified');
    const aiDescription = safeText(opportunity.elevator_pitch || opportunity.description, 'No description available.');
    const matchScore = Number(opportunity.match_score || 50);
    const pitchId = safeText(opportunity._id || opportunity.pitch_id || 'unknown');
    const entrepreneurId = safeText(opportunity.entrepreneur_id || '');
    const metrics = opportunity.metrics || {};

    return `
        <div class="pitch-card" data-opportunity-id="${pitchId}" data-pitch-id="${pitchId}" data-entrepreneur-id="${entrepreneurId}">
            <div class="pitch-header">
                <div>
                    <h3 class="pitch-title">${title}</h3>
                    <p class="pitch-category">${industry} &bull; ${stage} &bull; ${funding}</p>
                </div>
                <div class="pitch-match ${getMatchClass(matchScore)}">${matchScore}% fit</div>
            </div>

            <div class="ai-insights">
                <div class="insight-item">
                    <div class="insight-title">AI read</div>
                    <div class="insight-text">${aiDescription}</div>
                </div>
            </div>

            <div class="pitch-metrics" aria-label="Opportunity metrics">
                <div class="metric"><strong>${safeText(metrics.mrr, '$0')}</strong><span> MRR</span></div>
                <div class="metric"><strong>${safeText(metrics.users, '0')}</strong><span> users</span></div>
                <div class="metric"><strong>${safeText(metrics.employees, '0')}</strong><span> team</span></div>
            </div>

            <div class="decision-buttons">
                <button class="btn btn-outline" type="button" onclick="reviewSummary('${pitchId}')">View Full Pitch</button>
                <button class="btn btn-yes" data-opportunity="${pitchId}">Yes</button>
                <button class="btn btn-maybe" data-opportunity="${pitchId}">Maybe</button>
                <button class="btn btn-no" data-opportunity="${pitchId}">No</button>
            </div>
        </div>
    `;
}

function pitchValue(value, fallback = 'Not provided') {
    if (value === null || value === undefined || value === '') return fallback;
    if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function moneyValue(value) {
    if (value === null || value === undefined || value === '') return 'Not specified';
    const raw = String(value);
    if (raw.includes('$')) return raw;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? `$${numeric.toLocaleString()}` : raw;
}

function percentValue(value) {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return String(value).includes('%') ? String(value) : `${value}%`;
}

function detailBlock(label, value, options = {}) {
    const display = pitchValue(value, '');
    if (!display && options.hideEmpty) return '';
    return `
        <section class="full-pitch-block">
            <h4>${safeText(label)}</h4>
            <p>${safeText(display || 'Not provided')}</p>
        </section>
    `;
}

function metricTile(label, value) {
    return `
        <div class="full-pitch-metric">
            <span>${safeText(label)}</span>
            <strong>${safeText(value)}</strong>
        </div>
    `;
}

function formatPitchFieldName(field) {
    return field
        .replaceAll('_', ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function renderExtraPitchFields(pitch) {
    const fullPitch = pitch.full_pitch || pitch.all_details || {};
    const shownFields = new Set([
        '_id', 'title', 'category', 'industry', 'stage', 'status', 'description',
        'elevator_pitch', 'problem_statement', 'solution', 'target_market',
        'competitive_advantage', 'funding_amount', 'funding_goal',
        'monthly_revenue', 'cac', 'ltv', 'growth_rate', 'burn_rate', 'runway',
        'metrics', 'created_at', 'updated_at'
    ]);

    return Object.entries(fullPitch)
        .filter(([key, value]) => !shownFields.has(key) && value !== null && value !== undefined && value !== '')
        .map(([key, value]) => detailBlock(formatPitchFieldName(key), pitchValue(value)))
        .join('');
}

function displayPitchModal(pitch) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay full-pitch-overlay';

    const pitchId = pitch._id || pitch.pitch_id || '';
    const title = pitch.title || 'Untitled Pitch';
    const metrics = pitch.metrics || {};
    const extraFields = renderExtraPitchFields(pitch);

    modalOverlay.innerHTML = `
        <div class="modal-content full-pitch-modal" role="dialog" aria-modal="true" aria-label="Full pitch details">
            <button class="modal-close" type="button" aria-label="Close pitch details">&times;</button>

            <div class="full-pitch-hero">
                <div>
                    <span class="full-pitch-kicker">Full founder pitch</span>
                    <h2>${safeText(title)}</h2>
                    <p>${safeText(pitch.industry || 'Unknown Industry')} &bull; ${safeText(pitch.stage || 'Unknown Stage')} &bull; ${safeText(pitch.funding_amount || 'Funding not specified')}</p>
                </div>
                <span class="portfolio-status">${safeText(pitch.status || 'Under Review')}</span>
            </div>

            <div class="full-pitch-metrics">
                ${metricTile('Funding Ask', moneyValue(pitch.funding_amount))}
                ${metricTile('Funding Goal', moneyValue(pitch.funding_goal))}
                ${metricTile('Monthly Revenue', moneyValue(pitch.monthly_revenue || metrics.mrr))}
                ${metricTile('CAC', moneyValue(pitch.cac))}
                ${metricTile('LTV', moneyValue(pitch.ltv))}
                ${metricTile('Growth', percentValue(pitch.growth_rate))}
                ${metricTile('Burn Rate', moneyValue(pitch.burn_rate))}
                ${metricTile('Runway', pitch.runway ? `${pitch.runway} months` : 'Not specified')}
            </div>

            <div class="full-pitch-content">
                ${detailBlock('Elevator Pitch', pitch.elevator_pitch || pitch.description)}
                ${detailBlock('Problem', pitch.problem_statement)}
                ${detailBlock('Solution', pitch.solution)}
                ${detailBlock('Target Market', pitch.target_market)}
                ${detailBlock('Competitive Advantage', pitch.competitive_advantage)}
                ${detailBlock('Additional Description', pitch.description, { hideEmpty: true })}
                ${extraFields}
            </div>

            <div class="full-pitch-actions">
                <button class="btn btn-primary" type="button" onclick="reconsiderPitch('${safeText(pitchId)}')">Reconsider Pitch</button>
                <button class="btn btn-secondary" type="button" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Close</button>
            </div>
        </div>
    `;

    modalOverlay.querySelector('.modal-close').addEventListener('click', () => modalOverlay.remove());
    modalOverlay.addEventListener('click', event => {
        if (event.target === modalOverlay) modalOverlay.remove();
    });

    document.body.appendChild(modalOverlay);
}

function setupDecisionButtons() {
    document.querySelectorAll('.decision-buttons .btn[data-opportunity]').forEach(button => {
        button.addEventListener('click', function() {
            const opportunityId = this.getAttribute('data-opportunity');
            const buttonText = this.textContent.trim().toLowerCase();
            const decisionMap = {
                yes: 'matched',
                maybe: 'maybe',
                no: 'rejected'
            };
            makeDecision(opportunityId, decisionMap[buttonText] || buttonText, this);
        });
    });
}

function renderSummaries(summaries) {
    const container = document.getElementById('summaries-container');
    if (!container) return;

    if (!summaries || summaries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Summaries Yet</h3>
                <p>AI summaries appear here after you mark a pitch as Maybe.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = summaries.map(summary => {
        const pitchId = safeText(summary.pitch_id || '');
        const createdAt = summary.created_at ? new Date(summary.created_at).toLocaleDateString() : 'Recently';
        return `
            <div class="summary-card">
                <div class="summary-header">
                    <h3>${safeText(summary.pitch_title || 'Untitled Pitch')}</h3>
                    <span class="summary-date">${safeText(createdAt)}</span>
                </div>
                <div class="summary-content">
                    <p><strong>Decision:</strong> <span class="decision-${safeText(summary.decision)}">${formatDecision(summary.decision)}</span></p>
                    <p><strong>AI summary:</strong> ${safeText(summary.summary || summary.content || 'No summary available.')}</p>
                    ${summary.notes ? `<p><strong>Notes:</strong> ${safeText(summary.notes)}</p>` : ''}
                </div>
                <div class="summary-actions">
                    <button class="btn btn-primary" type="button" onclick="reviewSummary('${pitchId}')">View Full Pitch</button>
                    <button class="btn btn-outline" type="button" onclick="deleteSummary('${safeText(summary._id || '')}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

let portfolioFilter = 'all';
let portfolioSort = 'recent';

function parsePortfolioMoney(value) {
    if (value === null || value === undefined || value === '') return 0;
    const raw = String(value).replace(/[$,\s]/g, '').toLowerCase();
    const multiplier = raw.includes('m') ? 1000000 : raw.includes('k') ? 1000 : 1;
    const number = Number(raw.replace(/[^\d.]/g, ''));
    return Number.isFinite(number) ? number * multiplier : 0;
}

function formatPortfolioMoney(value) {
    const amount = typeof value === 'number' ? value : parsePortfolioMoney(value);
    if (!amount) return 'Not specified';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
    if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
}

function portfolioDate(value) {
    if (!value) return 'Recently';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString();
}

function normalizePortfolioStatus(status) {
    const value = String(status || 'Active').toLowerCase();
    if (value.includes('exit')) return 'exited';
    if (value.includes('pending') || value.includes('review') || value.includes('diligence')) return 'pending';
    return 'active';
}

function getPortfolioStats(items) {
    const investedCapital = items.reduce((sum, item) => sum + parsePortfolioMoney(item.amount || item.funding_goal), 0);
    const monthlyRevenue = items.reduce((sum, item) => sum + parsePortfolioMoney(item.monthly_revenue), 0);
    const active = items.filter(item => normalizePortfolioStatus(item.status) === 'active').length;
    const avgGrowth = items.length
        ? items.reduce((sum, item) => sum + (Number(item.growth_rate) || 0), 0) / items.length
        : 0;
    const portfolioValue = investedCapital + (monthlyRevenue * 12);
    const roi = investedCapital ? ((portfolioValue - investedCapital) / investedCapital) * 100 : 0;

    return { investedCapital, monthlyRevenue, active, avgGrowth, portfolioValue, roi };
}

function aggregatePortfolio(items, key) {
    const total = Math.max(1, items.length);
    const counts = items.reduce((acc, item) => {
        const label = item[key] || 'Unknown';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }));
}

function renderBreakdownList(items) {
    const colors = ['#0b5fff', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
    if (!items.length) {
        return '<div class="breakdown-empty">No portfolio data yet</div>';
    }

    return items.map((item, index) => `
        <div class="breakdown-item">
            <div class="breakdown-info">
                <div class="breakdown-color" style="background:${colors[index % colors.length]};"></div>
                <span class="breakdown-name">${safeText(item.label)}</span>
            </div>
            <span class="breakdown-value">${item.percent}%</span>
        </div>
    `).join('');
}

function getSortedPortfolio(items) {
    const filtered = items.filter(item => {
        if (portfolioFilter === 'all') return true;
        return normalizePortfolioStatus(item.status) === portfolioFilter;
    });

    return filtered.sort((a, b) => {
        if (portfolioSort === 'roi') return (Number(b.return) || Number(b.growth_rate) || 0) - (Number(a.return) || Number(a.growth_rate) || 0);
        if (portfolioSort === 'size') return parsePortfolioMoney(b.amount || b.funding_goal) - parsePortfolioMoney(a.amount || a.funding_goal);
        return new Date(b.investment_date || 0) - new Date(a.investment_date || 0);
    });
}

function renderPortfolioChart(items, stats) {
    const bars = items.slice(0, 6).map(item => {
        const value = parsePortfolioMoney(item.amount || item.funding_goal);
        const width = stats.investedCapital ? Math.max(8, Math.round((value / stats.investedCapital) * 100)) : 8;
        return `
            <div class="portfolio-chart-row">
                <span>${safeText(item.company_name || 'Matched Pitch')}</span>
                <div><i style="width:${width}%"></i></div>
                <strong>${formatPortfolioMoney(value)}</strong>
            </div>
        `;
    }).join('');

    return bars || '<div class="breakdown-empty">Portfolio chart will appear after your first Yes decision.</div>';
}

function renderInvestmentCard(investment) {
    const status = normalizePortfolioStatus(investment.status);
    const roi = Number(investment.return) || Number(investment.growth_rate) || 0;
    const currentValue = parsePortfolioMoney(investment.amount || investment.funding_goal) + (parsePortfolioMoney(investment.monthly_revenue) * 12);
    const pitchId = safeText(investment.pitch_id || '');

    return `
        <div class="investment-card" data-status="${status}">
            <div class="investment-header">
                <div>
                    <h3 class="investment-title">${safeText(investment.company_name || 'Matched Pitch')}</h3>
                    <p class="investment-category">${safeText(investment.industry || 'Unknown Industry')} &bull; ${safeText(investment.stage || 'Unknown Stage')}</p>
                </div>
                <div class="investment-status status-${status}">${safeText(status[0].toUpperCase() + status.slice(1))}</div>
            </div>
            <div class="investment-metrics">
                <div class="metric">${formatPortfolioMoney(investment.monthly_revenue)} MRR</div>
                <div class="metric">${safeText(investment.users || '0')} users</div>
                <div class="metric">${safeText(investment.employees || '0')} team</div>
            </div>
            <div class="investment-performance">
                <div>
                    <div class="portfolio-muted">Current tracked value</div>
                    <div class="performance-value">${formatPortfolioMoney(currentValue || investment.amount || investment.funding_goal)}</div>
                </div>
                <div class="performance-change ${roi >= 0 ? 'change-positive' : 'change-negative'}">${roi ? `${roi > 0 ? '+' : ''}${roi}%` : 'Tracking'}</div>
            </div>
            <div class="investment-actions">
                <button class="btn btn-outline" type="button" onclick="reviewSummary('${pitchId}')">View Details</button>
                <button class="btn btn-primary" type="button">Contact</button>
            </div>
        </div>
    `;
}

function renderPortfolioActivity(items) {
    if (!items.length) {
        return '<div class="empty-state"><p>Recent portfolio activity appears after you mark a pitch Yes.</p></div>';
    }

    return items.slice(0, 6).map(item => `
        <div class="activity-item">
            <div class="activity-info">
                <div class="activity-icon">$</div>
                <div class="activity-details">
                    <div class="activity-title">Added ${safeText(item.company_name || 'Matched Pitch')} to portfolio</div>
                    <div class="activity-date">${portfolioDate(item.investment_date)}</div>
                </div>
            </div>
            <div class="activity-amount">${formatPortfolioMoney(item.amount || item.funding_goal)}</div>
        </div>
    `).join('');
}

function renderPortfolioLegacySummary(portfolio) {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    const items = Array.isArray(portfolio) ? portfolio : [];
    if (!items.length) {
        container.className = 'portfolio-workspace';
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Portfolio Items Yet</h3>
                <p>When you press Yes on an opportunity, it will appear here with portfolio analytics and activity.</p>
            </div>
        `;
        return;
    }

    const stats = getPortfolioStats(items);
    const sortedItems = getSortedPortfolio([...items]);
    container.className = 'portfolio-workspace';
    container.innerHTML = `
        <div class="portfolio-overview">
            <div class="overview-card">
                <div class="overview-value">${formatPortfolioMoney(stats.portfolioValue)}</div>
                <div class="overview-label">Tracked Portfolio Value</div>
                <div class="overview-change change-positive">${stats.monthlyRevenue ? `${formatPortfolioMoney(stats.monthlyRevenue)} monthly revenue` : 'Based on saved pitches'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${formatPortfolioMoney(stats.investedCapital)}</div>
                <div class="overview-label">Funding Interest</div>
                <div class="overview-change change-positive">${items.length} saved opportunity${items.length === 1 ? '' : 'ies'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${stats.active}</div>
                <div class="overview-label">Active Investments</div>
                <div class="overview-change change-positive">${items.filter(item => normalizePortfolioStatus(item.status) === 'pending').length} pending</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${stats.roi.toFixed(1)}%</div>
                <div class="overview-label">Estimated ROI</div>
                <div class="overview-change ${stats.avgGrowth >= 0 ? 'change-positive' : 'change-negative'}">${stats.avgGrowth.toFixed(1)}% avg growth signal</div>
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header">
                <h2>Portfolio Performance</h2>
                <div class="filter-bar">
                    <select class="filter-select" disabled>
                        <option>Live portfolio data</option>
                    </select>
                </div>
            </div>
            <div class="performance-grid">
                <div class="performance-card">
                    <div class="performance-header"><h3 class="performance-title">Funding Exposure by Company</h3></div>
                    <div class="portfolio-chart">${renderPortfolioChart(items, stats)}</div>
                    <div class="portfolio-card-foot"><span>Initial: ${formatPortfolioMoney(stats.investedCapital)}</span><span>Tracked: ${formatPortfolioMoney(stats.portfolioValue)}</span></div>
                </div>
                <div class="performance-card">
                    <div class="performance-header"><h3 class="performance-title">Revenue Benchmark</h3></div>
                    <div class="benchmark-panel">
                        <strong>${stats.monthlyRevenue ? formatPortfolioMoney(stats.monthlyRevenue) : '$0'}</strong>
                        <span>combined monthly revenue from portfolio pitch data</span>
                    </div>
                    <div class="portfolio-card-foot"><span>Estimated ROI</span><span>${stats.roi.toFixed(1)}%</span></div>
                </div>
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header"><h2>Portfolio Breakdown</h2></div>
            <div class="breakdown-grid">
                <div class="breakdown-card">
                    <h3>By Industry</h3>
                    ${renderBreakdownList(aggregatePortfolio(items, 'industry'))}
                </div>
                <div class="breakdown-card">
                    <h3>By Stage</h3>
                    ${renderBreakdownList(aggregatePortfolio(items, 'stage'))}
                </div>
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header">
                <h2>My Investments</h2>
                <div class="filter-bar">
                    <div class="filter-tabs" id="portfolio-filter-tabs">
                        ${['all', 'active', 'exited', 'pending'].map(filter => `<button class="filter-tab ${portfolioFilter === filter ? 'active' : ''}" type="button" data-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join('')}
                    </div>
                    <select class="filter-select" id="portfolio-sort">
                        <option value="recent" ${portfolioSort === 'recent' ? 'selected' : ''}>Sort by: Recent</option>
                        <option value="roi" ${portfolioSort === 'roi' ? 'selected' : ''}>Sort by: ROI</option>
                        <option value="size" ${portfolioSort === 'size' ? 'selected' : ''}>Sort by: Investment Size</option>
                    </select>
                </div>
            </div>
            <div class="investments-grid">
                ${sortedItems.length ? sortedItems.map(renderInvestmentCard).join('') : '<div class="empty-state"><p>No investments match this filter.</p></div>'}
            </div>
        </div>

        <div class="content-section portfolio-inner-section">
            <div class="section-header"><h2>Recent Activity</h2></div>
            <div class="activity-list">${renderPortfolioActivity(items)}</div>
        </div>
    `;

    container.querySelectorAll('#portfolio-filter-tabs .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            portfolioFilter = tab.dataset.filter;
            renderPortfolio(items);
        });
    });

    const sortSelect = container.querySelector('#portfolio-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', event => {
            portfolioSort = event.target.value;
            renderPortfolio(items);
        });
    }
}

// Final portfolio presentation: matches the demo layout while keeping every value
// tied to saved portfolio, pitch, and decision records.
function portfolioMoneyCompact(value, empty = '$0.0M') {
    const amount = typeof value === 'number' ? value : parsePortfolioMoney(value);
    if (!amount) return empty;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
}

function portfolioMetricText(value, label, empty = 'Not provided') {
    const amount = parsePortfolioMoney(value);
    if (amount) return `${portfolioMoneyCompact(amount, '$0')} ${label}`;
    return `${empty} ${label}`;
}

function portfolioTrackedValue(item) {
    return explicitPortfolioValue(item);
}

function portfolioCardValueLabel(item) {
    if (item.exit_value) return 'Exit Value';
    if (item.current_value || item.valuation || item.market_value) return 'Current Value';
    if (item.amount || item.funding_goal) return 'Committed';
    return 'Value';
}

function renderDemoStyleBreakdown(items) {
    const industry = renderBreakdownList(aggregatePortfolio(items, 'industry'));
    const stage = renderBreakdownList(aggregatePortfolio(items, 'stage'));
    return `
        <div class="portfolio-demo-section">
            <div class="section-header"><h2>Portfolio Breakdown</h2></div>
            <div class="breakdown-grid">
                <div class="breakdown-card">
                    <h3>By Industry</h3>
                    ${industry}
                </div>
                <div class="breakdown-card">
                    <h3>By Stage</h3>
                    ${stage}
                </div>
            </div>
        </div>
    `;
}

function renderDemoInvestmentCard(investment) {
    const status = normalizePortfolioStatus(investment.status || investment.pitch_status);
    const returnValue = explicitPortfolioReturn(investment);
    const trackedValue = portfolioTrackedValue(investment);
    const committed = parsePortfolioMoney(investment.amount || investment.funding_goal);
    const displayValue = trackedValue || committed;
    const users = investment.users || investment.customers || investment.hospitals || investment.students || 'Not provided';
    const team = investment.employees ? `${safeText(investment.employees)} Employees` : `${safeText(users)} users`;
    const pitchId = safeText(investment.pitch_id || '');

    return `
        <div class="investment-card">
            <div class="investment-header">
                <div>
                    <h3 class="investment-title">${safeText(investment.company_name || 'Matched Pitch')}</h3>
                    <p class="investment-category">${safeText(investment.industry || 'Unknown Industry')} &bull; ${safeText(investment.stage || 'Unknown Stage')}</p>
                </div>
                <div class="investment-status status-${status}">${safeText(status[0].toUpperCase() + status.slice(1))}</div>
            </div>
            <div class="investment-metrics">
                <div class="metric">$ ${portfolioMetricText(investment.monthly_revenue, 'MRR', '$0')}</div>
                <div class="metric">${team}</div>
            </div>
            <div class="investment-performance">
                <div>
                    <div class="portfolio-muted">${portfolioCardValueLabel(investment)}</div>
                    <div class="performance-value">${portfolioMoneyCompact(displayValue, '$0')}</div>
                </div>
                <div class="performance-change ${returnValue === null || returnValue >= 0 ? 'change-positive' : 'change-negative'}">
                    ${returnValue === null ? 'Tracking' : `${returnValue > 0 ? '+' : ''}${returnValue}%`}
                </div>
            </div>
            <div class="investment-actions">
                <button class="btn btn-outline" type="button" onclick="reviewSummary('${pitchId}')">View Details</button>
                <button class="btn btn-outline" type="button">Update</button>
                <button class="btn btn-primary" type="button">Contact</button>
            </div>
        </div>
    `;
}

function renderDemoActivity(items, activity = latestPortfolioActivity) {
    const rows = (activity.length ? activity : items.map(item => ({
        type: 'matched',
        pitch_id: item.pitch_id,
        company_name: item.company_name,
        amount: item.amount || item.funding_goal,
        timestamp: item.investment_date
    }))).slice(0, 8);

    if (!rows.length) {
        return '<div class="empty-state"><p>Recent activity appears after investor decisions.</p></div>';
    }

    const actionLabel = {
        matched: 'Investment in',
        maybe: 'Saved for review',
        rejected: 'Passed on'
    };

    return rows.map(item => {
        const type = item.type || item.decision || 'matched';
        const isMatched = type === 'matched';
        const amount = parsePortfolioMoney(item.amount);
        return `
            <button class="activity-item activity-button" type="button" onclick="reviewSummary('${safeText(item.pitch_id || '')}')">
                <div class="activity-info">
                    <div class="activity-icon ${isMatched ? '' : 'activity-positive'}">${isMatched ? '$' : formatDecision(type).charAt(0)}</div>
                    <div class="activity-details">
                        <div class="activity-title">${safeText(actionLabel[type] || 'Decision on')} ${safeText(item.company_name || 'Unknown Pitch')}</div>
                        <div class="activity-date">${portfolioDate(item.timestamp)}</div>
                    </div>
                </div>
                <div class="activity-amount ${type === 'rejected' ? '' : 'change-positive'}">${isMatched && amount ? `-${portfolioMoneyCompact(amount, '$0')}` : formatDecision(type)}</div>
            </button>
        `;
    }).join('');
}

function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    const items = Array.isArray(portfolio) ? portfolio : [];
    container.className = 'portfolio-workspace portfolio-demo-workspace';

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Portfolio Items Yet</h3>
                <p>Press Yes on matched opportunities to fill this portfolio with real pitch data.</p>
            </div>
        `;
        return;
    }

    const stats = realPortfolioStats(items);
    const explicitValue = stats.explicitValue;
    const committed = stats.committed;
    const returns = items.map(explicitPortfolioReturn).filter(value => value !== null);
    const avgRoi = returns.length ? stats.avgReturn : 0;
    const sortedItems = getSortedPortfolio([...items]);

    container.innerHTML = `
        <div class="portfolio-overview">
            <div class="overview-card">
                <div class="overview-value">${portfolioMoneyCompact(explicitValue)}</div>
                <div class="overview-label">Total Portfolio Value</div>
                <div class="overview-change ${stats.impliedReturn === null || stats.impliedReturn >= 0 ? 'change-positive' : 'change-negative'}">${stats.impliedReturn === null ? 'No valuation data saved' : `${stats.impliedReturn.toFixed(1)}% from capital`}</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${portfolioMoneyCompact(committed)}</div>
                <div class="overview-label">Invested Capital</div>
                <div class="overview-change change-positive">${items.length} portfolio item${items.length === 1 ? '' : 's'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${stats.active}</div>
                <div class="overview-label">Active Investments</div>
                <div class="overview-change change-positive">${stats.pending} pending</div>
            </div>
            <div class="overview-card">
                <div class="overview-value">${avgRoi.toFixed(1)}%</div>
                <div class="overview-label">Average ROI</div>
                <div class="overview-change ${returns.length ? 'change-positive' : 'change-negative'}">${returns.length ? `${returns.length} ROI record${returns.length === 1 ? '' : 's'}` : 'No ROI data saved'}</div>
            </div>
        </div>

        <div class="portfolio-demo-section">
            <div class="section-header">
                <h2>Portfolio Performance</h2>
                <div class="filter-bar">
                    <select class="filter-select">
                        <option>Last 12 Months</option>
                        <option>Last 6 Months</option>
                        <option>Last 3 Months</option>
                        <option>Year to Date</option>
                    </select>
                </div>
            </div>
            <div class="performance-grid">
                <div class="performance-card">
                    <div class="performance-header"><h3 class="performance-title">Portfolio Value Over Time</h3></div>
                    <div class="chart-placeholder portfolio-value-placeholder">
                        ${renderPortfolioValueChart(items, stats)}
                    </div>
                    <div class="portfolio-card-foot">
                        <span>Initial: ${portfolioMoneyCompact(committed)}</span>
                        <span>Current: ${portfolioMoneyCompact(explicitValue)}</span>
                    </div>
                </div>
                <div class="performance-card">
                    <div class="performance-header"><h3 class="performance-title">Performance vs Benchmark</h3></div>
                    <div class="chart-placeholder benchmark-placeholder">
                        ${renderPortfolioBenchmark(stats)}
                    </div>
                    <div class="portfolio-card-foot">
                        <span>Your Portfolio: ${avgRoi.toFixed(1)}%</span>
                        <span>Benchmark: Not connected</span>
                    </div>
                </div>
            </div>
        </div>

        ${renderDemoStyleBreakdown(items)}

        <div class="portfolio-demo-section">
            <div class="section-header">
                <h2>My Investments</h2>
                <div class="filter-bar">
                    <div class="filter-tabs" id="portfolio-filter-tabs">
                        ${['all', 'active', 'exited', 'pending'].map(filter => `<button class="filter-tab ${portfolioFilter === filter ? 'active' : ''}" type="button" data-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join('')}
                    </div>
                    <select class="filter-select" id="portfolio-sort">
                        <option value="recent" ${portfolioSort === 'recent' ? 'selected' : ''}>Sort by: Recent</option>
                        <option value="roi" ${portfolioSort === 'roi' ? 'selected' : ''}>Sort by: ROI</option>
                        <option value="size" ${portfolioSort === 'size' ? 'selected' : ''}>Sort by: Investment Size</option>
                    </select>
                </div>
            </div>
            <div class="investments-grid">
                ${sortedItems.length ? sortedItems.map(renderDemoInvestmentCard).join('') : '<div class="empty-state"><p>No investments match this filter.</p></div>'}
            </div>
        </div>

        <div class="portfolio-demo-section">
            <div class="section-header"><h2>Recent Activity</h2></div>
            <div class="activity-list">${renderDemoActivity(items)}</div>
        </div>
    `;

    container.querySelectorAll('#portfolio-filter-tabs .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            portfolioFilter = tab.dataset.filter;
            renderPortfolio(items);
        });
    });

    const sortSelect = container.querySelector('#portfolio-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', event => {
            portfolioSort = event.target.value;
            renderPortfolio(items);
        });
    }
}
