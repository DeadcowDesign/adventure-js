import { UI } from './ui.js';

class Adventure {
    constructor(gameName, inputBarId, outputDivId, titleId, statusBarId) {

        this.roomFile = "";
        this.itemFile = "";
        this.gameMeta = "";
        this.playerFile = "";
        // Most important - name of the game folder!
        this.gameName = gameName;

        this.rooms = {}; // The object that will hold the room data.
        this.itemList = {};  // The object that will hold the items.
        this.gameMeta = {}; // The object that will hold the game metadata.
        this.player = {};

        this.commandArray = [];  // The array of commands from the UI.

        // Dictionary definitions for valid command words
        this.verbs = [
            "GO",
            "TAKE",
            "DROP",
            "INVENTORY",
            "USE",
            "LOOK",
            "ON",
            "WITH",
            "FROM",
            "LOAD",
        ];

        this.ui = new UI(inputBarId, outputDivId, titleId, statusBarId);

        window.addEventListener("inputupdate", (ev) => {
            this.processCommand(ev.detail);
        });

        this.main();

    }

    // Load the files and start the game.
    main() {
        // JSON files for game data. All must be indcluded.
        this.roomFile = `./${this.gameName}/rooms.json`;
        this.itemFile = `./${this.gameName}/items.json`;
        this.gameMetaFile = `./${this.gameName}/meta.json`;
        this.playerFile = `./${this.gameName}/player.json`;

        this.rooms = JSON.parse(localStorage.getItem(this.gameName + "-rooms"));
        this.itemList = JSON.parse(localStorage.getItem(this.gameName + "-items"));
        this.gameMeta = JSON.parse(localStorage.getItem(this.gameName + "-meta"));
        this.player = JSON.parse(localStorage.getItem(this.gameName + "-player"));

        // Get all the game data from the game folder (specified above).
        fetch(this.roomFile)
            .then((response) => response.json())
            .then((json) => {
                if (this.rooms == null) {
                    this.rooms = json;
                }
                fetch(this.itemFile)
                    .then((response) => response.json())
                    .then((json) => {
                        if (this.itemList == null) {
                            this.itemList = json;
                        }
                        fetch(this.gameMetaFile)
                            .then((response) => response.json())
                            .then((json) => {
                                if (this.gameMeta == null) {
                                    this.gameMeta = json;
                                }
                                fetch(this.playerFile)
                                    .then((response) => response.json())
                                    .then((json) => {
                                        if (this.player == null) {
                                            this.player = json;
                                        }
                                        // This is where we do the thing.
                                        this.configureGame();
                                    })
                            })
                    })
            });

    }

    /**
     * configureGame 
     * Do game configuration stuff here, like setting initial room, title, player
     * stats, plus whatever else. This is the first thing to run when all the
     * game resources have loaded in.
     */
    configureGame() {

        this.ui.setTitle(this.gameMeta.title);
        this.updatePlayerStatusBar();
        this.describeRoom();
    }

    saveGameData() {
        localStorage.setItem(this.gameName + '-rooms', JSON.stringify(this.rooms));
        localStorage.setItem(this.gameName + '-items', JSON.stringify(this.itemList));
        localStorage.setItem(this.gameName + '-player', JSON.stringify(this.player));
    }

    /**
     * processCommand - runs on inputupdate (from the UI, when the player
     * submits the form). This is really the main game loop:
     * Get input -> parse into commands -> action commands
     * @param {string} rawCommand The input from the UI
     */
    processCommand(rawCommand) {
        rawCommand = rawCommand.toUpperCase();

        this.ui.println([rawCommand]);
        this.tokenizeCommand(rawCommand);

        if (!this.gameMeta.verbs[this.commandArray[0]]) {
            this.ui.println("I don't understand. Try something else, or use help.");
        } else {
            this[this.gameMeta.verbs[this.commandArray[0]]]();
        }
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
        let commandParts = command.split(" ");
        let verbString = "";
        let processing = true;

        // First word should always be a command verb.
        this.commandArray.push(commandParts.shift());

        while (processing === true) {

            let token = commandParts.shift();
            if (this.verbs.indexOf(token) === -1) {

                verbString += " " + token;

            } else {

                this.commandArray.push(verbString.trim());
                verbString = "";
                this.commandArray.push(token);
            }

            if (!commandParts.length) {

                if (verbString.length) {

                    this.commandArray.push(verbString.trim());
                }

                processing = false;
            }
        }
    }

    describeRoom() {
        this.ui.clearscreen();

        if (this.rooms[this.player.currentRoom].oneShot && this.rooms[this.player.currentRoom].oneShotPlayed == false) {
            this.ui.println(this.rooms[this.player.currentRoom].oneShot);
            this.rooms[this.player.currentRoom].oneShotPlayed = true;
        }

        this.ui.println(this.rooms[this.player.currentRoom].description);

        if (typeof (this.rooms[this.player.currentRoom].exits) != 'undefined' && this.rooms[this.player.currentRoom].exits.length) {
            this.rooms[this.player.currentRoom].exits.forEach((exit) => {
                if (exit.door) {
                    let door = this.getItemById(exit.door);
                    if (door.isActive) {
                        this.ui.println(door.description);
                    } else {
                        this.ui.println(exit.description)
                    }
                } else {
                    this.ui.println(exit.description);
                }
            });
        }

        let roomItems = this.getRoomInventory();

        if (roomItems.length) {
            this.ui.println(["You can see:"]);

            let itemNames = [];

            roomItems.forEach(item => {
                itemNames.push(item);
            });

            this.ui.printlist(itemNames);
        }

    }

    getItemById(targetItem) {

        for (let [id, item] of Object.entries(this.itemList)) {
            if (id === targetItem) {
                if (item.isActive) {
                    return item;
                }
            }
        }

        return "";
    }

    getItemIdByName(targetItem) {
        for (let [id, item] of Object.entries(this.itemList)) {
            if (item.name === targetItem) {
                if (item.isActive) {
                    return id;
                }
            }
        }

        return "";
    }

    getRoomInventory() {
        var roomInventory = [];

        for (let [index, item] of Object.entries(this.itemList)) {
            if (item.location === this.player.currentRoom && !item.isDoor && item.isActive) {
                roomInventory.push(item.name);
            }
        }

        return roomInventory;
    }

    getRoomExitsByName(exitString) {
        for (let exit of this.rooms[this.player.currentRoom].exits) {
            if (exit.name === exitString) {
                return exit;
            }
        }

        return false;
    }

    getPlayerInventory() {
        var playerInventory = [];

        for (let [index, item] of Object.entries(this.itemList)) {
            if (item.location === "playerInventory" && item.isActive) {
                playerInventory.push(item.name);
            }
        }

        return playerInventory;
    }

    getInventorySpace() {
        if (!this.player.inventoryLimit) {
            return -1;
        }

        return this.player.inventoryLimit - this.getPlayerInventory().length;
    }

    /******************
     * GAME FUNCTIONS *
     ******************/
    go() {
        let direction = this.commandArray[1];
        let foundRoom = false;

        this.rooms[this.player.currentRoom].exits.forEach((exit) => {

            if (exit.name === direction) {
                foundRoom = true;
                if (exit.door) {
                    let door = this.getItemById(exit.door);
                    if (door.isActive) {
                        this.ui.println(door.description);
                        return;
                    } else {
                        this.player.currentRoom = exit.destination;
                        this.describeRoom();
                        this.saveGameData();
                        return;
                    }
                } else {
                    this.player.currentRoom = exit.destination;
                    this.describeRoom();
                    this.saveGameData();
                    return;
                }
            }
        });

        if (foundRoom) return;

        this.ui.printrandom([
            "You cannot go that way.",
            "There is nothing here.",
            "Try another direction.",
        ]);
    }

    take() {
        let takeTarget = this.commandArray[1];
        let itemId = this.getItemIdByName(takeTarget);

        if (this.itemList[itemId] && this.itemList[itemId].location == this.player.currentRoom) {

            if (!this.itemList[itemId].isGrabbable) {

                this.ui.println("You cannot pick that up.");

            } else if (this.itemList[itemId].useOnPickup) {
                this.commandArray = [
                    "USE",
                    takeTarget,
                    "ON",
                    "PLAYER"
                ];

                this.use();

            } else {

                if (!this.getInventorySpace === -1) {
                    this.itemList[itemId].location = "playerInventory";
                } else if (this.getInventorySpace() > 0) {
                    if (this.itemList[itemId].take?.description) {
                        this.ui.println(this.itemList[itemId].take.description);
                    }
                    this.itemList[itemId].location = "playerInventory";
                    this.saveGameData();
                    //this.describeRoom();

                } else {
                    this.ui.println("You do not have space to carry that.");
                }

            }

            if (this.itemList[itemId].take?.mutations) {
                this.doMutations(this.itemList[itemId].take.mutations);
            }

        } else {

            this.ui.printrandom([
                "You cannot take what is not there.",
                "You can't see that anywhere",
            ]);
        }
    }

    drop() {
        let dropTarget = this.commandArray[1];
        let itemId = this.getItemIdByName(dropTarget);

        if (this.itemList[itemId] && this.itemList[itemId].location == "playerInventory") {
            this.itemList[itemId].location = this.player.currentRoom;
            this.saveGameData();
            this.describeRoom();
            this.updatePlayerStatusBar();
        }
    }

    look() {
        if (this.commandArray[1] == 'undefined' || typeof (this.commandArray[1]) == null) {
            this.describeRoom();
            return;
        }

        let exit = this.getRoomExitsByName(this.commandArray[1]);

        if (exit) {

            this.ui.println(exit.description);
            return;
        }


        let target = this.getItemIdByName(this.commandArray[1]);

        if (target && (this.itemList[target].location == this.player.currentRoom || this.itemList[target].location == "playerInventory")) {
            this.ui.println(this.itemList[target].description);
            this.ui.scrollTo();
            if (this.itemList[target].look?.mutations) {
                this.doMutations(this.itemList[target].look.mutations);
                this.saveGameData();
            }
        } else {
            this.ui.println("You cannot see that.");
        }

        return;
    }


    help() {
        this.ui.println(this.gameMeta.helpText);
    }

    inventory() {
        let inventory = this.getPlayerInventory();
        if (!inventory.length) {
            this.ui.println(["Your pockets are empty"]);
        } else {
            this.ui.println(["You are carrying:"]);
            this.ui.printlist(inventory);
        }
    }

    use() {
        /* 
            Check if the user has supplied an 'on' and a 'subject' - e.g.
            "use key on door"
            TODO - Tidy this up and check for valid use nouns ('on', 'with' etc)
        */

        let object = this.getItemIdByName(this.commandArray[1]);

        // If there is no subject, then we use the object as the subject (e.g. "USE DOOR")
        // and we use the subject on itself (if available).
        let subject = !this.commandArray[3] ? this.commandArray[1] : this.commandArray[3];

        if (subject !== "PLAYER") {

            subject = this.getItemIdByName(this.commandArray[3]);

        } else {

            if (!this.itemList[object]) {
                this.ui.println("You cannot do that. (player)")
            }

            // Make sure that the object is either in the room, or on the player.
            if (this.itemList[object].location !== "playerInventory"
                && this.itemList[object].location !== this.player.currentRoom
            ) {
                this.ui.println("You do not have that.")
                return;
            }
            this.doMutations(this.itemList[object].use.mutations);


            this.itemList[object].isActive = false;
            this.ui.println(this.itemList[object].use.description);
            this.saveGameData();
            this.updatePlayerStatusBar();

            return;
        }

        // Check that these are valid items.
        if (!this.itemList[subject] || !this.itemList[object]) {
            this.ui.println("You cannot do that.");
            return;
        }

        // Make sure that the object is either in the room, or on the player.
        if (this.itemList[object].location !== "playerInventory"
            && this.itemList[object].location !== this.player.currentRoom
        ) {
            this.ui.println("You do not have that.")
            return;
        }

        // Make sure that the subject is either in the room, or on the player.
        if (this.itemList[subject].location !== "playerInventory"
            && this.itemList[subject].location !== this.player.currentRoom
        ) {
            this.ui.println("You do not have that.")
            return;
        }

        // Make sure we can actually use the object with the subject
        if (!this.itemList[object].use.subject === subject) {
            this.ui.printrandom([
                ["You cannot use those together."]
            ]);

            return;
        }


        this.doMutations(this.itemList[object].use.mutations);

        this.itemList[object].isActive = false;

        this.ui.println(this.itemList[object].use.description);
        this.saveGameData();
    }

    load() {
        if (this.commandArray[1] == 'undefined' || typeof (this.commandArray[1]) == null) {
            return false;
        } else {
            this.gameName = this.commandArray[1].toLowerCase();
            this.gameName = this.gameName.replace(/\s/g, "-");
            this.main();
        }
    }

    updatePlayerStatusBar() {

        if (!this.player.statusBar) {
            return false;
        }

        let statusBarString = "";
        for (let [property, alias] of Object.entries(this.player.statusBar)) {
            if (property === "inventoryLimit") {
                statusBarString += `${alias}: ${this.getInventorySpace()} `;
            } else {
                statusBarString += `${alias}: ${this.player[property].current} `;
            }
        }

        this.ui.setStatusBar(statusBarString);
    }

    doMutations(mutationList) {
        for (let [item, mutations] of Object.entries(mutationList)) {
            for (let [prop, val] of Object.entries(mutations)) {
                if (this.itemList.hasOwn(item)) {
                    if (val.hasOwnProperty("set")) {
                        this.itemList[item][prop] = val["set"];
                    } else if (val.hasOwnProperty("increase")) {
                        this.itemList[item][prop] += val["increase"];
                    } else if (val.hasOwnProperty("decrease")) {
                        this.itemList[item][prop] -= val["decrease"];
                    }
                } else if (this.rooms.hasOwn(item)) {
                    if (val.hasOwnProperty("set")) {
                        this.rooms[item][prop] = val["set"];
                    } else if (val.hasOwnProperty("increase")) {
                        this.rooms[item][prop] += val["increase"];
                    } else if (val.hasOwnProperty("decrease")) {
                        this.rooms[item][prop] -= val["decrease"];
                    }
                }
            }
        }
    }

}

export { Adventure };
