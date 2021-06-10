// const remoteUrl = "https://savage-165eb.web.app/";
// const remoteUrl = "http://localhost:5000/";
const remoteUrl = "http://localhost:3000/";

let commentLink = document.getElementById("commentLink");
let errorMsg = document.getElementById("errorMsg");
chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    let url = tabs[0].url;
    if (url.startsWith('chrome://')) {
        errorMsg.innerHTML = 'This extension can\'t be used on a chrome settings page.';
        errorMsg.hidden = false;
    }
    else {
        url = new URL(url);
        commentLink.href = remoteUrl + "comment?v=" + url.searchParams.get("v");
    }
});