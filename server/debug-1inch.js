
const fetch = require('node-fetch');

async function comprehensive1inchDiagnostic() {
  console.log('🔍 COMPREHENSIVE 1INCH API DIAGNOSTIC');
  console.log('=====================================\n');

  // 1. Check Environment Variables
  console.log('1️⃣ CHECKING ENVIRONMENT VARIABLES:');
  const apiKey = process.env.ONEINCH_API_KEY;
  console.log('   API Key exists:', !!apiKey);
  console.log('   API Key length:', apiKey ? apiKey.length : 0);
  console.log('   API Key preview:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NONE');
  console.log('   Expected length: ~64 characters\n');

  if (!apiKey) {
    console.log('❌ CRITICAL: No API key found!');
    console.log('   Solution: Add ONEINCH_API_KEY to Replit Secrets');
    console.log('   Get key from: https://portal.1inch.dev/\n');
    return;
  }

  // 2. Test Basic Connectivity
  console.log('2️⃣ TESTING BASIC CONNECTIVITY:');
  try {
    const response = await fetch('https://api.1inch.dev', {
      method: 'HEAD',
      timeout: 5000
    });
    console.log('   1inch domain reachable:', response.status);
  } catch (error) {
    console.log('   1inch domain ERROR:', error.message);
  }
  console.log('');

  // 3. Test API Key Validity
  console.log('3️⃣ TESTING API KEY VALIDITY:');
  const testUrl = 'https://api.1inch.dev/swap/v6.0/1/quote?src=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&dst=0xA0b86991c951449b402c7C27D170c54E0F13A8BfD&amount=1000000000000000000';
  
  try {
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'BitWallet/1.0'
      },
      timeout: 10000
    });

    console.log('   Response Status:', response.status);
    console.log('   Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ API KEY VALID');
      console.log('   Sample ETH price: $', (parseFloat(data.dstAmount) / 1000000).toFixed(2));
    } else {
      const errorText = await response.text();
      console.log('   ❌ API KEY INVALID or ERROR');
      console.log('   Error:', errorText);
      
      if (response.status === 401) {
        console.log('   Problem: Invalid API key');
      } else if (response.status === 403) {
        console.log('   Problem: API key lacks permissions');
      } else if (response.status === 429) {
        console.log('   Problem: Rate limit exceeded');
      }
    }
  } catch (error) {
    console.log('   ❌ REQUEST FAILED:', error.message);
  }
  console.log('');

  // 4. Test Token Addresses
  console.log('4️⃣ TESTING TOKEN ADDRESSES:');
  const tokens = [
    {
      name: 'ETH',
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    },
    {
      name: 'LINK',
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
    },
    {
      name: 'UNI', 
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
    }
  ];

  for (const token of tokens) {
    try {
      const tokenUrl = `https://api.1inch.dev/swap/v6.0/1/quote?src=${token.address}&dst=0xA0b86991c951449b402c7C27D170c54E0F13A8BfD&amount=1000000000000000000`;
      
      const response = await fetch(tokenUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        const price = parseFloat(data.dstAmount) / 1000000;
        console.log(`   ${token.name}: ✅ $${price.toFixed(2)}`);
      } else {
        console.log(`   ${token.name}: ❌ HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ${token.name}: ❌ ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log('');

  // 5. Check Server Route
  console.log('5️⃣ CHECKING SERVER ROUTE:');
  try {
    const serverResponse = await fetch('http://localhost:5000/api/tokens', {
      timeout: 5000
    });
    
    console.log('   Server route status:', serverResponse.status);
    
    if (serverResponse.ok) {
      const data = await serverResponse.json();
      console.log('   Tokens returned:', data.tokens?.length || 0);
      console.log('   Data source:', data.source);
      console.log('   Has real prices:', data.source === '1inch');
      
      if (data.debug) {
        console.log('   Debug info:', data.debug);
      }
    } else {
      console.log('   Server route ERROR');
    }
  } catch (error) {
    console.log('   Server route ERROR:', error.message);
    console.log('   Make sure server is running on port 5000');
  }
  console.log('');

  // 6. Final Recommendations
  console.log('6️⃣ RECOMMENDATIONS:');
  console.log('   If API key is invalid: Regenerate at https://portal.1inch.dev/');
  console.log('   If rate limited: Wait 1-2 minutes and try again');
  console.log('   If network issues: Check Replit connection');
  console.log('   If server issues: Restart your Repl');
  console.log('\n🎯 Next steps: Check the issues above and fix them one by one.');
}

// Run the diagnostic
comprehensive1inchDiagnostic().catch(console.error);
