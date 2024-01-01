class Parser
{

    constructor(gameName){
        this.gameName = gameName || 'default';
        this.thesaurus = null;
        this.loadThesaurus();

        this.command = "";
        this.subjectArray = [];
        this.commandParts = [];

    }

    // Load the game-specific thesaurus. Might be an idea to implement a
    // default thesaurus as well. Use the game specific one as an override.
    // This function is v.important. Must not fail or game should exit.
    loadThesaurus()
    {
        // Get all the game data from the game folder (specified above).
        fetch(`./${this.gameName}/thesaurus.json`)
        .then((response) => response.json())
        .then((json) => {
            this.thesaurus = json;
            return true;
        })
    }

    getCommand() {
        return this.command;
    }

    getParams(){
        return this.subjectArray;
    }

        /**
     * tokenizeCommand - splits a space-separated string out into parts
     * and processes them into an array. If an item is not a verb it is
     * concatenated until we hit a verb, then that string is added to the
     * array, and the verb is added after. Loops until we run out of words.
     * @param {string} command The string to be tokenized
     */
    tokenizeCommand(command) {
        this.commandArray = []; // Don't forget to clean.
        this.subjectArray = [];
        let commandParts = command.split(" ");
        let verbString = "";
        let processing = true;

        // First word should always be a command verb and we take this as the 
        // verbatim command. Other commands further down the chain are ignored.
        this.command = this.getCommandFromVerb(commandParts.shift());

        while (processing === true) {

            let token = commandParts.shift();

            if (this.getPrepositionsFromCommand(this.command, token) === true) {
                this.subjectArray.push(verbString.trim().toLowerCase());

                verbString = "";
            } else {

                verbString += " " + token;
            }

            if (!commandParts.length) {

                if (verbString.length) {

                    this.subjectArray.push(verbString.trim());
                }

                processing = false;
            }
        }
    }

    getCommandFromVerb(token) {
        for(const verb in this.thesaurus.verbs) {

            if (this.thesaurus.verbs[verb].synonyms.includes(token))
            {
                return verb;
            }
        }

        return "";
    }

    getPrepositionsFromCommand(command, token) {

        if (!this.thesaurus.verbs[command].hasOwnProperty("prepositions")) {
            return false;
        }
        
        if (this.thesaurus.verbs[command].prepositions.includes(token)) {
            return true;
        };

        return false;
    }
}

export {Parser};