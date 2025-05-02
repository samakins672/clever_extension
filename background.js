chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'generateCoverLetter') {
    const tokens = await chrome.storage.local.get(['clevercraftAccessToken', 'clevercraftRefreshToken']);
    if (!tokens.clevercraftAccessToken) {
      chrome.tabs.sendMessage(sender.tab.id, { action: 'coverLetterFailed', error: 'Not logged in' });
      return;
    }

    try {
      let res = await fetch('https://clever-86au.onrender.com/coverletters/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + tokens.clevercraftAccessToken
        },
        body: JSON.stringify({
          platform: 'UPWORK',
          job_description: request.payload.jobDescription,
          additional_instructions: ''
        })
      });

      if (res.status === 401 && tokens.clevercraftRefreshToken) {
        console.log('Access token expired. Refreshing...');
        const refreshRes = await fetch('https://clever-86au.onrender.com/accounts/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokens.clevercraftRefreshToken })
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access) {
          await chrome.storage.local.set({ clevercraftAccessToken: refreshData.access });
          res = await fetch('https://clever-86au.onrender.com/coverletters/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + refreshData.access
            },
            body: JSON.stringify({
              platform: 'UPWORK',
              job_description: request.payload.jobDescription,
              additional_instructions: ''
            })
          });
        } else {
          throw new Error('Refresh failed, please log in again.');
        }
      }

      const data = await res.json();
      if (!res.ok || !data.data.result || !data.data.result.text) throw new Error(data.data.message || 'Failed to generate cover letter.');

      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'coverLetterGenerated',
        result: data.data.result.text
      });
    } catch (err) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'coverLetterFailed',
        error: err.message
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('CleverCraft extension installed');
  chrome.storage.local.set({ clevercraftAccessToken: null, clevercraftRefreshToken: null });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('CleverCraft extension started');
});