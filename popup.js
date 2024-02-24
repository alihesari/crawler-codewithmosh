document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("getLeasons").addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "getLeasons" });
        });
    });

    document.getElementById("nextLesson").addEventListener("click", function () {
    });

    document.getElementById('downloadText').addEventListener('click', function () {
        chrome.runtime.sendMessage({ command: 'downloadText' });
    });

});

