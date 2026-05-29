document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('proposal-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.loading-spinner');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const proposalData = {
            submitter_name: formData.get('submitter_name'),
            submitter_email: formData.get('submitter_email'),
            company_name: formData.get('company_name'),
            title: formData.get('title'),
            category: formData.get('category'),
            description: formData.get('description'),
            budget: formData.get('budget'),
            timeline: formData.get('timeline'),
            technologies: Array.from(document.querySelectorAll('select[name="technologies"] option:checked')).map(opt => opt.value),
            experience: formData.get('experience'),
            portfolio_url: formData.get('portfolio_url')
        };

        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';

        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(proposalData)
            });

            const data = await response.json();

            if (data.status === 'success') {
                showSuccessModal(data.match_score);
                form.reset();
            } else {
                alert('Error: ' + data.msg);
            }
        } catch (error) {
            console.error('Error submitting proposal:', error);
            alert('Error submitting proposal. Please try again.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline-block';
            spinner.style.display = 'none';
        }
    });
});

function showSuccessModal(matchScore) {
    const modal = document.getElementById('success-modal');
    const matchScoreElement = document.getElementById('match-score');
    
    matchScoreElement.textContent = matchScore;
    modal.style.display = 'block';
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    modal.style.display = 'none';
}