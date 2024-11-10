let accessToken = '';

function loginWithLinkedIn() {
    const width = 450;
    const height = 730;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
        '/auth/linkedin',
        'LinkedIn Login',
        `width=${width},height=${height},left=${left},top=${top}`
    );
}

window.addEventListener('message', async (event) => {
    if (event.data.token) {
        accessToken = event.data.token;
        await fetchProfileAndPosts();
    }
});

async function fetchProfileAndPosts() {
    try {
        // Fetch profile
        const profileResponse = await fetch('http://localhost:3001/api/linkedin/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!profileResponse.ok) {
            throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        
        // Create the HTML
        const feedHtml = `
            <div class="linkedin-profile">
                ${profileData.picture ? `
                    <img src="${profileData.picture}" 
                         alt="${profileData.name}" 
                         class="profile-picture"
                    />
                ` : ''}
                <h3>${profileData.name}</h3>
                <p class="location">
                    <i class="bi bi-geo-alt"></i> 
                    ${profileData.locale.language.toUpperCase()}-${profileData.locale.country}
                </p>
                <button onclick="loginWithLinkedIn()" class="refresh-button">
                    Refresh Profile
                </button>
            </div>
            <div id="linkedin-posts-container">
                <!-- Posts will be loaded here -->
            </div>
        `;
        
        document.getElementById('linkedin-feed').innerHTML = feedHtml;

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('linkedin-feed').innerHTML = `
            <div class="error-message">
                <p>Error: ${error.message}</p>
                <button onclick="loginWithLinkedIn()" class="login-button">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Initialize the UI
document.getElementById('linkedin-feed').innerHTML = `
    <div class="text-center">
        <button onclick="loginWithLinkedIn()" class="login-button">
            <i class="bi bi-linkedin"></i> Connect LinkedIn Profile
        </button>
    </div>
`;