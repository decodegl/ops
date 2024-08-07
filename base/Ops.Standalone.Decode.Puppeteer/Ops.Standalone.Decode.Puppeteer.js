const puppeteer = op.require('puppeteer');

const inRun = op.inTriggerButton("Run");
const inPage = op.inString('URL');

const outFinished = op.outTrigger("Finished");
const outContent = op.outString('HTML content');
const outError = op.outString('Error');

let browser = null;
let page = null;

inRun.onTriggered = async () => {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
        });
    }
    const url = inPage.get();
    if (!url) return;
    await goToPage(url);
}

async function goToPage(url) {
    try {
        if (!page) {
            page = await browser.newPage();
        }

        // Attempt to navigate to the page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for the body element to ensure the page has loaded
        await page.waitForSelector('body');

        // Extract HTML content
        const htmlContent = await page.evaluate(() => {
            return document.documentElement.outerHTML;
        });

        outError.set(null);
        outContent.set(htmlContent);
        outFinished.trigger();

    } catch (error) {
        // Handle navigation and evaluation errors
        outError.set(`Failed to load page or extract content: ${error.message}`);
    }
}

op.onDelete = async () => {
    if (browser)
        await browser.close();
}