#!/usr/bin/env node

/**
 * Reset the application to vanilla state for new users
 * This script clears all cached credentials and setup status
 */

const http = require('http');

console.log('🧹 Resetting application to vanilla state...');
console.log('This will clear all cached credentials and setup status.');

// Make a POST request to the clear-cache endpoint
const postData = '';
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/clear-cache',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ Successfully reset to vanilla state!');
        console.log('\n📋 Items cleared:');
        result.clearedItems.forEach(item => {
          console.log(`   • ${item}`);
        });
        
        if (result.errors && result.errors.length > 0) {
          console.log('\n⚠️  Some warnings occurred:');
          result.errors.forEach(error => {
            console.log(`   • ${error}`);
          });
        }
        
        console.log('\n🎉 Your app is now ready for new users!');
        console.log('   New users will see the setup wizard when they first access the app.');
        console.log('   You can now safely commit this state to GitHub.');
      } else {
        console.error('❌ Failed to reset to vanilla state:', result.message);
        if (result.errors) {
          result.errors.forEach(error => {
            console.error(`   • ${error}`);
          });
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:', error.message);
  console.error('\n💡 Make sure the development server is running:');
  console.error('   npm run dev');
  process.exit(1);
});

req.write(postData);
req.end();
