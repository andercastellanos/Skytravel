/**
 * =============================================================================
 * 🧪 TESTIMONIAL SYSTEM TEST SCRIPT
 * 📝 Run this in your browser console to test the system
 * 🌐 Open any page on your site and paste this into DevTools console
 * =============================================================================
 */

class TestimonySystemTester {
    constructor() {
        this.baseUrl = window.location.origin;
        this.functionUrl = `${this.baseUrl}/.netlify/functions/submit-testimony`;
        
        console.log('🧪 Testimony System Tester Initialized');
        console.log('🌐 Base URL:', this.baseUrl);
        console.log('⚡ Function URL:', this.functionUrl);
        
        this.runTests();
    }
    
    async runTests() {
        console.log('\n🚀 Starting Testimonial System Tests...\n');
        
        try {
            await this.testCORS();
            await this.testTextSubmission();
            await this.testValidation();
            await this.testGitHubAPI();
            
            console.log('\n✅ All tests completed! Check results above.');
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }
    
    // Test 1: CORS Headers
    async testCORS() {
        console.log('🔍 Test 1: Testing CORS headers...');
        
        try {
            const response = await fetch(this.functionUrl, {
                method: 'OPTIONS'
            });
            
            if (response.ok) {
                console.log('✅ CORS test passed - Function responds to OPTIONS');
                console.log('📋 CORS Headers:', Object.fromEntries(response.headers));
            } else {
                console.warn('⚠️  CORS test warning - Function exists but returned:', response.status);
            }
        } catch (error) {
            console.error('❌ CORS test failed:', error.message);
        }
        
        console.log('');
    }
    
    // Test 2: Text-only submission
    async testTextSubmission() {
        console.log('🔍 Test 2: Testing text-only submission...');
        
        const testData = {
            name: "Test User " + Date.now(),
            trip: "Test Pilgrimage (December 2025)",
            testimony: "This is a comprehensive test testimony that exceeds the 50 character minimum requirement. It describes an amazing pilgrimage experience with excellent organization, spiritual growth, and wonderful memories that will last a lifetime. The guide was knowledgeable and the accommodations were comfortable.",
            email: "test@example.com",
            language: "en",
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        try {
            console.log('📤 Sending test submission...');
            console.log('📋 Test data:', testData);
            
            const response = await fetch(this.functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('✅ Text submission test PASSED');
                console.log('🎉 GitHub Issue created:', result.issueUrl);
                console.log('📋 Full response:', result);
                
                // Suggest checking GitHub
                console.log('\n🔗 Next steps:');
                console.log('1. Check GitHub Issues: https://github.com/andercastellanos/Skytravel/issues');
                console.log('2. Look for issue #' + result.issueNumber);
                console.log('3. Verify YAML front matter format');
                console.log('4. Add "verified" label to approve testimonial');
                
            } else {
                console.error('❌ Text submission test FAILED');
                console.error('📋 Response:', result);
                console.error('📋 Status:', response.status);
            }
            
        } catch (error) {
            console.error('❌ Text submission test FAILED with error:', error);
        }
        
        console.log('');
    }
    
    // Test 3: Validation
    async testValidation() {
        console.log('🔍 Test 3: Testing form validation...');
        
        const invalidTests = [
            {
                name: 'Empty name test',
                data: { name: '', trip: 'Test', testimony: 'A'.repeat(60), language: 'en' }
            },
            {
                name: 'Short testimony test',
                data: { name: 'Test', trip: 'Test', testimony: 'Too short', language: 'en' }
            },
            {
                name: 'Invalid email test',
                data: { name: 'Test', trip: 'Test', testimony: 'A'.repeat(60), email: 'invalid-email', language: 'en' }
            }
        ];
        
        for (const test of invalidTests) {
            try {
                const response = await fetch(this.functionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(test.data)
                });
                
                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    console.log(`✅ ${test.name}: Correctly rejected`);
                    console.log(`   📋 Error: ${result.error}`);
                } else {
                    console.warn(`⚠️  ${test.name}: Should have been rejected but wasn't`);
                }
                
            } catch (error) {
                console.log(`✅ ${test.name}: Correctly rejected (network error)`);
            }
        }
        
        console.log('');
    }
    
    // Test 4: GitHub API connectivity
    async testGitHubAPI() {
        console.log('🔍 Test 4: Testing GitHub API connectivity...');
        
        try {
            // Test public API access (no auth needed)
            const response = await fetch('https://api.github.com/repos/andercastellanos/Skytravel/issues?labels=testimony&state=open&per_page=5');
            
            if (response.ok) {
                const issues = await response.json();
                console.log('✅ GitHub API test passed');
                console.log(`📋 Found ${issues.length} testimonial issues in repository`);
                
                if (issues.length > 0) {
                    console.log('📋 Latest testimonial issues:');
                    issues.forEach((issue, index) => {
                        console.log(`   ${index + 1}. #${issue.number}: ${issue.title}`);
                        console.log(`      Labels: ${issue.labels.map(l => l.name).join(', ')}`);
                    });
                }
                
                // Check rate limit
                const rateLimitResponse = await fetch('https://api.github.com/rate_limit');
                const rateLimit = await rateLimitResponse.json();
                console.log('📊 GitHub API Rate Limit:', rateLimit.rate);
                
            } else {
                console.error('❌ GitHub API test failed:', response.status, response.statusText);
            }
            
        } catch (error) {
            console.error('❌ GitHub API test failed:', error.message);
        }
        
        console.log('');
    }
    
    // Helper: Test specific functionality
    async testSpecific(testName) {
        console.log(`🎯 Running specific test: ${testName}`);
        
        switch (testName.toLowerCase()) {
            case 'cors':
                await this.testCORS();
                break;
            case 'text':
            case 'submission':
                await this.testTextSubmission();
                break;
            case 'validation':
                await this.testValidation();
                break;
            case 'github':
                await this.testGitHubAPI();
                break;
            default:
                console.log('Available tests: cors, text, validation, github');
        }
    }
}

// Helper functions for manual testing
window.TestimonyTester = {
    // Quick test runner
    runTests: () => new TestimonySystemTester(),
    
    // Test specific functionality
    test: (testName) => new TestimonySystemTester().testSpecific(testName),
    
    // Manual submission test
    submitTest: async (customData = {}) => {
        const defaultData = {
            name: "Manual Test User",
            trip: "Manual Test Pilgrimage",
            testimony: "This is a manual test submission created from the browser console. It includes enough text to pass the 50 character minimum requirement and tests the complete submission flow.",
            email: "manual-test@example.com",
            language: "en"
        };
        
        const testData = { ...defaultData, ...customData };
        
        try {
            const response = await fetch(`${window.location.origin}/.netlify/functions/submit-testimony`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            
            const result = await response.json();
            console.log('📤 Manual test result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Manual test failed:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check function status
    checkStatus: async () => {
        try {
            const response = await fetch(`${window.location.origin}/.netlify/functions/submit-testimony`, {
                method: 'OPTIONS'
            });
            
            console.log('Function Status:', {
                exists: response.status !== 404,
                cors: response.ok,
                status: response.status,
                headers: Object.fromEntries(response.headers)
            });
            
        } catch (error) {
            console.error('Status check failed:', error);
        }
    }
};

// Auto-run tests
console.log(`
🧪 TESTIMONIAL SYSTEM TESTER LOADED
=======================================

Usage:
• TestimonyTester.runTests()           - Run all tests
• TestimonyTester.test('cors')         - Test specific functionality  
• TestimonyTester.submitTest()         - Manual submission test
• TestimonyTester.checkStatus()        - Check function status

Tests will run automatically in 3 seconds...
`);

// Auto-run after 3 seconds
setTimeout(() => {
    new TestimonySystemTester();
}, 3000);