function println(text) {

    let outputDiv = document.getElementById("output");
    let compiledText = "<p>";

    if (Array.isArray(text)) {
        text.forEach((line) => {
            compiledText += `${line}<br>`;
        })

    } else {

        compiledText += `${text}<br>`;
    }

    compiledText += '</p>';

    outputDiv.innerHTML += compiledText;
}

function printlist(items) {
    let outputText = '<ul>';
    items.forEach((item) => {
        outputText += `<li>${item}</li>`;
    });
    outputText += '</ul>';

    document.getElementById("output").innerHTML += outputText;
}

function clearscreen()
{
    document.getElementById("output").innerHTML = "";
}

function printrandom(phrases)
{
    let phrase = phrases[Math.floor(Math.random() * phrases.length)];
    println(phrase);
}

export {println, printlist, clearscreen, printrandom};