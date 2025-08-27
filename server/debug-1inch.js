const fetch = require('node-fetch');

async function test1inchAPI() {
  console.log('🔍 TESTING 1INCH API WITH CORRECT ADDRESSES');
  console.log('============================================\n');

  const apiKey = process.env.ONEINCH_API_KEY;

  if (!apiKey) {
    console.log('❌ No API key found!');
    return;
  }

  console.log('🔑 API Key configured:', !!apiKey);
  console.log('🔑 API Key length:', apiKey.length);
  console.log('🔑 API Key preview:', `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}\n`);

  // Test with the exact same addresses from your routes.ts
  const tests = [
    {
      name: 'ETH',
      src: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH (checksummed)
      dst: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD', // USDC (checksummed)
      amount: '1000000000000000000' // 1 ETH in wei
    },
    {
      name: 'LINK',
      src: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK (checksummed)
      dst: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD', // USDC (checksummed)
      amount: '1000000000000000000' // 1 LINK in wei
    },
    {
      name: 'UNI',
      src: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI (checksummed)
      dst: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD', // USDC (checksummed)
      amount: '1000000000000000000' // 1 UNI in wei
    }
  ];

  for (const test of tests) {
    console.log(`🧪 Testing ${test.name}...`);

    const url = `https://api.1inch.dev/swap/v6.0/1/quote?src=${test.src}&dst=${test.dst}&amount=${test.amount}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'BitWallet/1.0'
        }
      });

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const price = parseFloat(data.dstAmount) / 1000000; // USDC has 6 decimals
        console.log(`   ✅ Success: $${price.toFixed(2)}`);
        console.log(`   Gas estimate: ${data.estimatedGas || 'N/A'}`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);

        // Try to parse error details
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.description) {
            console.log(`   Description: ${errorData.description}`);
          }
        } catch (e) {
          // Error text is not JSON
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }

    console.log(''); // Empty line between tests

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('🎯 If all tests show success, your API should be working!');
  console.log('🎯 If you still see mock data, restart your server with: npm run dev');
}

test1inchAPI().catch(console.error);