document.addEventListener('DOMContentLoaded', function() {
    
    const roleOptions = document.querySelectorAll('.role-option');
    let selectedRole = 'business'; 
    
    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            
            roleOptions.forEach(opt => opt.classList.remove('selected'));
            
            
            this.classList.add('selected');
            
            
            selectedRole = this.getAttribute('data-role');
        });
    });
    
    
    document.querySelector('.role-option[data-role="business"]').classList.add('selected');
    
    
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        
        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing In...';
        submitBtn.disabled = true;
        
        fetch("/login", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                role: selectedRole,
                email: email,
                password: password 
            })
        })
        .then(async response => {
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.msg || `Server error: ${response.status}`);
            }
            
            return data;
        })
        .then(data => {
            console.log("Login response:", data); 
            
            if (data.status === "success") {
                
                if (data.redirect) {
                    console.log("Redirecting to:", data.redirect); 
                    window.location.href = data.redirect;
                } else {
                    
                    console.log("No redirect URL, using fallback");
                    window.location.href = `/dashboard/${selectedRole}`;
                }
            } else {
                throw new Error(data.msg || 'Login failed');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Error: ' + error.message);
            
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
});