var lessonsData = {};
var downloadedLessonKey = null;

chrome.downloads.onCreated.addListener(function (downloadItem) {
    var link = downloadItem.finalUrl;
    var parts = link.substr(0, link.indexOf(".mp4?") + 4).split("/");
    var fileName = parts[parts.length - 1];

    try {
        setTimeout(function () {
            if (downloadedLessonKey !== null && lessonsData[downloadedLessonKey]) {
                lessonsData[downloadedLessonKey].fileName = fileName;
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { command: "updateStorage", key: downloadedLessonKey, fileName });
                    downloadedLessonKey = null;
                });
            }
        }, 2000)
    } catch (error) {
        console.log("error on background.js - downloads.onCreated")
        console.warn(error);
    }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.command === 'updateLessonData') {
        lessonsData = message.data;
    }

    if (message.command === "updateDownloadedLessonKey") {
        downloadedLessonKey = message.downloadedLessonKey
    }

    if (message.command === 'downloadDataFile') {
        let data = '\uFEFF' + "Topic Name,Lesson Name,File Name\n";

        let lessonKeys = Object.keys(lessonsData);
        for (let i = 0; i < lessonKeys.length; i++) {
            let key = lessonKeys[i];
            let lesson = lessonsData[key];
            let topicName = lesson.topicName?.replaceAll(",", "");
            let lessonName = lesson.lessonName?.replaceAll(",", "");
            let fileName = lesson.fileName?.replaceAll(",", "");
            data += `${topicName},${lessonName},${fileName}\n`;
        }

        const blob = new Blob([data], { type: "text/csv;charset=utf-8" });

        // use BlobReader object to read Blob data
        const reader = new FileReader();
        reader.onload = () => {
            const buffer = reader.result;
            const blobUrl = `data:${blob.type};base64,${btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))}`;
            chrome.downloads.download({
                url: blobUrl,
                filename: "lesson.csv",
                saveAs: false,
                conflictAction: "uniquify"
            }, () => {
                sendResponse({ success: true });
            });
        };
        reader.readAsArrayBuffer(blob);
        return true;
    }
});