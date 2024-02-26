var extractedLessonsData = {};
var readyToDownload = true;
function initCrawler() {
    const htmlCode = `
    <div id="contentCrawler">
        <button class="crawlerButton" id="getLeasons">Get Lessons</button>
        <button class="crawlerButton" id="downloadDataFile">Download Data File</button>
        <button class="crawlerButton btn-red" id="cleanStorage">Clean Storage</button>
        <div id="lessonCrawlerContainer"></div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', htmlCode);
}
initCrawler();

document.getElementById("getLeasons").addEventListener("click", function () {
    const tempData = JSON.parse(getData());
    if (tempData !== null) {
        let lessonKeys = Object.keys(tempData);
        for (let i = 0; i < lessonKeys.length; i++) {
            let key = lessonKeys[i];
            let lesson = tempData[key];
            if (lesson.status === "ReadyToDownload") {
                lesson.status = "Pending"
            }
            tempData[key] = lesson;
        }
        extractedLessonsData = tempData;
    } else {
        extractedLessonsData = getAllLeasonsLinks();
    }
    setData(JSON.stringify(extractedLessonsData));
    chrome.runtime.sendMessage({ command: "updateLessonData", data: extractedLessonsData });
    renderLessonCrawler();
});

document.getElementById('downloadDataFile').addEventListener('click', function () {
    chrome.runtime.sendMessage({ command: 'downloadDataFile' });
});

document.getElementById('cleanStorage').addEventListener('click', function () {
    if (confirm("Are you sure to clean the storage?")) {
        localStorage.removeItem("extractedLessonsData");
        location.reload();
    }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.command === 'updateStorage') {
        if (message.key && message.fileName && extractedLessonsData[message.key]) {
            console.log("updateStorage string", JSON.stringify(message))
            extractedLessonsData[message.key].fileName = message.fileName;
            setData(JSON.stringify(extractedLessonsData));
            readyToDownload = true;
        } else {
            console.log("error on content.js - updateStorage - ", {
                message,
                itemExists: extractedLessonsData[message.key]
            })
        }
    }
});

function renderLessonCrawler() {
    let lessonKeys = Object.keys(extractedLessonsData);
    const container = document.getElementById('lessonCrawlerContainer');
    try {
        for (let i = 0; i < lessonKeys.length; i++) {
            let key = lessonKeys[i];
            let lesson = extractedLessonsData[key];

            console.log("render button", {
                key,
                lesson
            })

            const button = document.createElement('button');
            button.classList.add(`lessonCrawlerButton`);
            button.classList.add(`lessonCrawlerButton${lesson.status}`)
            button.setAttribute('lesson-key', key);
            button.textContent = `${lesson.lessonName} - ${lesson.status}`;
            button.addEventListener("click", function () {
                const key = this.getAttribute("lesson-key");
                const lesson = extractedLessonsData[key];

                if (lesson.status === "Pending") {
                    const link = document.querySelector(lesson.selector);
                    if (link) {
                        link.click();

                        if (readyToDownload === false) {
                            console.log("Wait for loading...");
                            return;
                        }

                        setTimeout(function () {
                            if (window.location.href.indexOf(key) >= 0) {
                                extractedLessonsData[key].status = "ReadyToDownload";
                                renderCrawlerButton(key, lesson, "Pending", "ReadyToDownload");
                                setData(JSON.stringify(extractedLessonsData));
                            }
                        }, 1000)
                    }
                } else if (lesson.status === "ReadyToDownload") {
                    let downloadLink = document.querySelector('.download');
                    if (downloadLink) {
                        let fileName = downloadLink.innerText.trim();
                        let link = downloadLink.getAttribute('href');

                        if (link.indexOf("http") > -1) {
                            link = "https://members.codewithmosh.com" + link;
                        }

                        const pdfAttr = downloadLink.getAttribute("data-x-origin-download-name");
                        if (pdfAttr && pdfAttr.indexOf(".pdf")) {
                            console.log("download pdf link: ", link);
                            // download pdf
                            fetch(link)
                            .then(response => response.blob())
                            .then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                            })
                            .catch(error => {
                                console.error('Error downloading PDF:', error);
                            });
                        } else {
                            // download video
                            window.open(link, "_blank");
                        }
                        
                        extractedLessonsData[key].status = "Crawled";
                        renderCrawlerButton(key, lesson, "ReadyToDownload", "Crawled");
                        setData(JSON.stringify(extractedLessonsData));
                        chrome.runtime.sendMessage({
                            command: "updateDownloadedLessonKey",
                            downloadedLessonKey: key
                        });
                        readyToDownload = false;
                    } else {
                        extractedLessonsData[key].status = "NotDownloadable";
                        renderCrawlerButton(key, lesson, "ReadyToDownload", "NotDownloadable");
                        setData(JSON.stringify(extractedLessonsData));
                    }
                }
            });
            container.appendChild(button);
        }
    } catch (error) {
        console.log("Error renderLessonCrawler", error)
    }
}

function setData(data) {
    localStorage.setItem('extractedLessonsData', data);
}

function getData() {
    const value = localStorage.getItem('extractedLessonsData');
    if (value !== null) {
        return value;
    } else {
        return null;
    }
}

function getExpiryDate(days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    return date.toUTCString();
}

function renderCrawlerButton(key, lesson, oldStatus, newStatus) {
    const button = document.querySelector(`button[lesson-key="${key}"]`);
    if (button) {
        button.classList.remove("lessonCrawlerButton" + oldStatus);
        button.classList.add("lessonCrawlerButton" + newStatus);
        button.innerHTML = `${lesson.lessonName} - ${lesson.status}`;
    }
}

function getAllLeasonsLinks() {
    var lessonsData = {};
    console.log("start", lessonsData)
    var courseSections = document.querySelectorAll(".course-section");
    for (let i = 0; i < courseSections.length; i++) {
        const courseSection = courseSections[i];
        var title = courseSection.querySelector(".section-title").textContent.trim();
        var parts = title.split('(');
        title = parts[0].trim();
        var links = courseSection.querySelectorAll(".section-list li a");
        for (let j = 0; j < links.length; j++) {
            const link = links[j];
            var name = link.querySelector(".lecture-name").textContent.trim();
            var parts = name.split('(');
            name = parts[0].trim();
            var href = link.getAttribute("href");
            var fullLink = "https://members.codewithmosh.com" + href;
            var selector = 'a[href="' + href + '"]';

            lessonsData[href] = {
                topicName: title,
                lessonName: name,
                link: fullLink,
                selector,
                status: 'Pending'
            }
        }
    }
    return lessonsData;
}
