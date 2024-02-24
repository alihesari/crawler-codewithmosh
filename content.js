var extractedLessonsData = {};
function initCrawler() {
    const htmlCode = `
    <div id="contentCrawler">
        <button class="crawlerButton" id="getLeasons">Get Lessons</button>
        <button class="crawlerButton" id="downloadDataFile">Download Data File</button>
        <div id="lessonCrawlerContainer"></div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', htmlCode);
}
initCrawler();

document.getElementById("getLeasons").addEventListener("click", function () {
    extractedLessonsData = getAllLeasonsLinks();
    chrome.runtime.sendMessage({ command: "updateLessonData", data: extractedLessonsData });
    renderLessonCrawler();
});

document.getElementById('downloadDataFile').addEventListener('click', function () {
    chrome.runtime.sendMessage({ command: 'downloadDataFile' });
});

function renderLessonCrawler() {
    let lessonKeys = Object.keys(extractedLessonsData);
    const container = document.getElementById('lessonCrawlerContainer');
    for (let i = 0; i < lessonKeys.length; i++) {
        let key = lessonKeys[i];
        let lesson = extractedLessonsData[key];

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

                    setTimeout(function() {
                        if (window.location.href.indexOf(key) >= 0) {
                            extractedLessonsData[key].status = "ReadyToDownload";
                            renderCrawlerButton(key, lesson, "Pending", "ReadyToDownload");
                        }
                    }, 1000)
                }
            } else if (lesson.status === "ReadyToDownload") {
                let downloadLink = document.querySelector('.download');
                if (downloadLink) {
                    const hrefValue = downloadLink.getAttribute('href');
                    const link = "https://members.codewithmosh.com" + hrefValue;
                    window.open(link, "_blank");
                    extractedLessonsData[key].status = "Crawled";
                    renderCrawlerButton(key, lesson, "ReadyToDownload", "Crawled");
                    chrome.runtime.sendMessage({ 
                        command: "updateDownloadedLessonKey", 
                        downloadedLessonKey: key 
                    });
                } else {
                    extractedLessonsData[key].status = "Not downloadable";
                    renderCrawlerButton(key, lesson, "ReadyToDownload", "NotDownloadable");
                }
            }
        });
        container.appendChild(button);
    }
}

function renderCrawlerButton(key, lesson, oldStatus, newStatus) {
    const button = document.querySelector(`button[lesson-key="${key}"]`);
    if (button) {
        button.classList.remove("lessonCrawlerButton"+oldStatus);
        button.classList.add("lessonCrawlerButton"+newStatus);
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
