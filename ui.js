class UI {

    constructor(inputBarId, outputDivId, titleId, statusBarId) {
        this.inputBar = document.getElementById(inputBarId);
        this.inputForm = this.inputBar.form;
        this.outputDiv = document.getElementById(outputDivId);
        this.titleId = document.getElementById(titleId);
        this.statusBarId = document.getElementById(statusBarId);

        this.inputForm.addEventListener("submit", (e) => {
            e.preventDefault();
            window.dispatchEvent(
                new CustomEvent("inputupdate", {'detail': this.inputBar.value})
            );

            this.inputBar.value = "";
        });
    }

    setTitle(title) {
        this.titleId.innerText = title;
    }

    setStatusBar(status) {
        this.statusBarId.innerHTML = status;
    }

    getCommand() {
        command = this.inputBar.value.toUppercase();
        this.println(command);
        this.inputBar.value = "";
    }

    println(text) {

        let compiledText = "<p>";

        if (Array.isArray(text)) {
            text.forEach((line) => {
                compiledText += `${line}<br>`;
            })

        } else {

            compiledText += `${text}<br>`;
        }

        compiledText += '</p>';

        this.outputDiv.innerHTML += compiledText;
        this.scrollToBottom();
    }

    printlist(items) {
        let outputText = '<ul>';
        items.forEach((item) => {
            outputText += `<li>${item}</li>`;
        });
        outputText += '</ul>';

        this.outputDiv.innerHTML += outputText;
        this.scrollToBottom();

    }

    clearscreen() {
        this.outputDiv.innerHTML = "";
    }

    printrandom(phrases) {
        let phrase = phrases[Math.floor(Math.random() * phrases.length)];
        this.println(phrase);
    }

    scrollToBottom()
    {
        this.outputDiv.parentNode.scrollTop = this.outputDiv.parentNode.scrollHeight;

    }
}

export { UI };