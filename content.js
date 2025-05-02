function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const intervalTime = 100;
    let elapsedTime = 0;

    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      } else {
        elapsedTime += intervalTime;
        if (elapsedTime >= timeout) {
          clearInterval(interval);
          reject(new Error('Element not found: ' + selector));
        }
      }
    }, intervalTime);
  });
}

async function injectGenerateButton() {
  try {
    const textareaWrapper = await waitForElement('.textarea-wrapper');

    const generateBtn = document.createElement('button');
    generateBtn.innerText = '💥 Generate Cover Letter';
    generateBtn.style.cssText = 'position:absolute;top:-30px;right:0;background:green;color:white;padding:6px 10px;border:none;border-radius:5px;cursor:pointer;';
    generateBtn.id = 'clevercraft-generate-btn';
    textareaWrapper.style.position = 'relative';
    textareaWrapper.appendChild(generateBtn);

    // Inside your injectGenerateButton function...
    generateBtn.addEventListener('click', async () => {
      generateBtn.innerText = '⏳ Generating...';
      const { clevercraftToken } = await chrome.storage.local.get('clevercraftToken');
      if (!clevercraftToken) {
        alert('Please set your CleverCraft token in the extension popup.');
        generateBtn.innerText = '❌ Token Missing';
        setTimeout(() => { generateBtn.innerText = '💥 Generate Cover Letter'; }, 2000);
        return;
      }

      const moreBtn = document.querySelector('.air3-truncation-btn');
      if (moreBtn && moreBtn.getAttribute('aria-expanded') !== 'true') {
        const scrollPosition = window.scrollY; // Save current scroll position
        moreBtn.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        window.scrollTo(0, scrollPosition); // Restore scroll position
      }

      const jobDescEl = document.querySelector('.description .air3-truncation');
      const jobDescription = jobDescEl ? jobDescEl.innerText : null;

      if (!jobDescription) {
        alert('Job description not found on page.');
        generateBtn.innerText = '❌ No Description';
        setTimeout(() => { generateBtn.innerText = '💥 Generate Cover Letter'; }, 2000);
        return;
      }

      chrome.runtime.sendMessage({
        action: 'generateCoverLetter',
        payload: {
          jobDescription,
          token: clevercraftToken
        }
      });
    });

    // Listen for background response
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'coverLetterGenerated') {
        const textarea = document.querySelector('textarea.air3-textarea.inner-textarea');
        const generateBtn = document.getElementById('clevercraft-generate-btn');
        if (textarea) {
          console.log('Cover Letter Generated:', request.result);
          textarea.value = request.result;
    
          // Notify framework
          const inputEvent = new Event('input', { bubbles: true });
          textarea.dispatchEvent(inputEvent);
    
          if (generateBtn) generateBtn.innerText = '💥 Done!';
        }
        setTimeout(() => { if (generateBtn) generateBtn.innerText = '💥 Generate Cover Letter'; }, 2000);
      }

      if (request.action === 'coverLetterFailed') {
        const generateBtn = document.getElementById('clevercraft-generate-btn');
        if (generateBtn) generateBtn.innerText = '❌ Error';
        alert('Error generating cover letter: ' + request.error);
        setTimeout(() => { if (generateBtn) generateBtn.innerText = '💥 Generate Cover Letter'; }, 2000);
      }
    });


  } catch (error) {
    console.warn(error.message);
  }
}

// Run after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectGenerateButton);
} else {
  injectGenerateButton();
}
