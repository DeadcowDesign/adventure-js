import { UI } from './ui.js';
import { Parser } from './parser.js';

class Adventure {
    constructor(gameName, inputBarId, outputDivId, titleId, statusBarId) {

        this.roomFile = "";
        this.itemFile = "";
        this.gameMeta = "";
        this.playerFile = "";
        this.conditionFailMessage = "You cannot do that";

        // Most important - name of the game folder!
        this.gameName = gameName;
        this.defaultGameName = gameName;
    

        if (this.getLastPlayed() === null) {
            this.gameName = gameName;
        } else {
            this.gameName = this.getLastPlayed();
        }

        this.saveLastPlayed(this.gameName);
        
        this.rooms = {}; // The object that will hold the room data.
        this.itemList = {};  // The object that will hold the items.
        this.gameMeta = {}; // The object that will hold the game metadata.
        this.player = {};

        this.commandArray = [];  // The array of commands from the UI.


        this.ui = new UI(inputBarId, outputDivId, titleId, statusBarId);
        this.parser = new Parser(this.gameName);
        
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
            .then((response) => {
                if (response.ok) {
                    return response.json();
                }

                this.ui.println("Couldn't find the game file. Try loading another game.");
                this.saveLastPlayed('default');
                //this.main();
            })
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
                                    .then(async (json) => {
                                        if (this.player == null) {
                                            this.player = json;
                                        }
                                        
                                        let itemList = [];

                                        for (let item of Object.entries(this.itemList)) {
                                            itemList.push(item.name);
                                        };

                                        for (let item of Object.entries(this.rooms)) {
                                            itemList.push(item.name);
                                        };

                                        await this.parser.loadThesaurus();
                                            
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

        this.loadTheme();
        this.ui.setTitle(this.gameMeta.title);
        this.updatePlayerStatusBar();
        this.describeRoom();
        //this.parser.getCommand("GO");
    }

    saveGameData() {
        localStorage.setItem(this.gameName + '-rooms', JSON.stringify(this.rooms));
        localStorage.setItem(this.gameName + '-items', JSON.stringify(this.itemList));
        localStorage.setItem(this.gameName + '-player', JSON.stringify(this.player));
    }

    deleteGameData() {
        localStorage.removeItem(this.gameName + '-rooms');
        localStorage.removeItem(this.gameName + '-items');
        localStorage.removeItem(this.gameName + '-player');
    }
    /**
     * processCommand - runs on inputupdate (from the UI, when the player
     * submits the form). This is really the main game loop:
     * Get input -> parse into commands -> action commands
     * @param {string} rawCommand The input from the UI
     */
    processCommand(rawCommand) {
        rawCommand = rawCommand.toUpperCase();

        //this.ui.println([rawCommand]);
        this.parser.tokenizeCommand(rawCommand);
 
        let command = this.parser.getCommand().toLowerCase();
        let params = this.parser.getParams();
        this[command](params);
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

            roomItems.forEach(item => {
                this.ui.println(item.description);
            });
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

            if (item.name.toLowerCase() === targetItem.toLowerCase()) {
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
                roomInventory.push(item);
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
    go(directions) {
        let direction = directions[0];
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

    take(takeTargets) {
        let takeTarget = takeTargets[0];
        let itemId = this.getItemIdByName(takeTarget);

        if (itemId !== "" && this.itemList[itemId].location == this.player.currentRoom) {

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

                if (this.getInventorySpace() === -1) {
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

    drop(dropTargets) {
        let dropTarget = dropTargets[0];
        let itemId = this.getItemIdByName(dropTarget);

        if (this.itemList[itemId] && this.itemList[itemId].location == "playerInventory") {
            this.itemList[itemId].location = this.player.currentRoom;
            this.saveGameData();
            this.describeRoom();
            this.updatePlayerStatusBar();
        }
    }

    look(targetItems) {
        if (targetItems[0] == 'undefined' || typeof (targetItems[0]) == null) {
            this.describeRoom();
            return;
        }

        let exit = this.getRoomExitsByName(targetItems[0]);

        if (exit) {

            this.ui.println(exit.description);
            return;
        }


        let target = this.getItemIdByName(targetItems[0]);

        if (target && (this.itemList[target].location == this.player.currentRoom || this.itemList[target].location == "playerInventory")) {
            if (this.itemList[target].hasOwnProperty("lookDescription")) {
                this.ui.println(this.itemList[target].lookDescription);
            } else {
                this.ui.println(this.itemList[target].description);
            }

            //this.ui.scrollTo();
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

    use(subjects) {


        let object = this.getItemIdByName(subjects[0]);
        
        // If there is no subject, then we use the object as the subject (e.g. "USE DOOR")
        // and we use the subject on itself (if available).
        let subject = !subjects[1] ? subjects[0] : subjects[1];

        if (subject !== "PLAYER") {

            subject = this.getItemIdByName(subject);

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

        this.ui.println(this.itemList[object].use.description);
        this.saveGameData();
    }

    load(game) {
    
        this.gameName = game[0].toLowerCase();
        this.gameName = this.gameName.replace(/\s/g, "-");
        this.saveLastPlayed(this.gameName);
        this.main();
    }

    reset() {
        this.deleteGameData();
        this.main();
    }

    theme(theme) {
        
        if (Array.isArray(theme)) {
            theme = theme[0];
        }

        if (!this.gameMeta.hasOwnProperty('themes')) {
            return false;
        }

        if (!this.gameMeta.themes.includes(theme.toLowerCase())) {
            this.ui.println(["Theme not found.", "The following themes are available:"]);
            this.gameMeta.themes.forEach((theme) => {
                this.ui.println(theme);
            });

            return false;

        }

        document.body.className = "";
        document.body.className = theme.toLowerCase();
        this.saveTheme(theme);
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    loadTheme() {

        let theme = 'greenscreen';

        if (localStorage.getItem('theme') === null) {
            this.saveTheme(theme);
        } else {
            theme = localStorage.getItem('theme');
        }

        this.theme(theme);
    }

    saveLastPlayed(gamename) {
        localStorage.setItem('lastPlayed', gamename);
    }

    getLastPlayed() {
        return localStorage.getItem('lastPlayed');
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

        mutationList.forEach((mutation) => {

            if (!mutation.hasOwnProperty('target') || !this.itemList.hasOwnProperty(mutation.target) || !mutation.hasOwnProperty("actions")) {
                console.error("Missing mutation prop");
                return false;
            }

            if (!Array.isArray(mutation.actions)) return false;

            if (mutation.hasOwnProperty("conditions")) {

                let conditionsResult = true;

                mutation.conditions.forEach((condition) => {

                    if (this.doCondition(condition) === false) {
                        conditionsResult = false;
                    }
                });

                if (conditionsResult === false) {
                    return false;
                }
            }

            mutation.actions.forEach((action) => {
                if (!action.hasOwnProperty("property") 
                    || !action.hasOwnProperty("action") 
                    || !action.hasOwnProperty("value")
                ) {
                    console.error("Missing action property");
                    return false;
                }

                switch(action.action) {
                    case ("add"):
                        this.itemList[mutation.target][action.property] += action.value;
                        break;
                    case("subtract"):
                        this.itemList[mutation.target][action.property] -= action.value;
                        break;
                    default:
                        this.itemList[mutation.target][action.property] = action.value;
                }
            })
        });
    }

    doCondition(condition)
    {
        let hasPassed = false;

        if (!condition.hasOwnProperty("target") 
            || !condition.hasOwnProperty("property") 
            || !condition.hasOwnProperty("value") 
            || !condition.hasOwnProperty("is"))
        return false;

        if (!this.itemList.hasOwnProperty(condition.target) 
            || !(this.itemList[condition.target].hasOwnProperty(condition.property)))
        return false;

        let targetProperty = this.itemList[condition.target][condition.property];

        switch(condition.is) {
            case ("greaterThan"):
                if (targetProperty > condition.value) {
                    hasPassed = true;
                }
            break;
            case ("lessThan"):
                if (targetProperty < condition.value) {
                    hasPassed = true;
                }
            break;
            case ("equalTo"):
                if (targetProperty == condition.value) {
                    hasPassed = true;
                }
            break;
            case ("notEqualTo"):
                if (targetProperty == condition.value) {
                    hasPassed = true;
                }
            break;
        }

        if (hasPassed === false) {
            if (condition.hasOwnProperty("failMessage")) {
                this.ui.println(condition.failMessage);
            } else {
                this.ui.println(this.conditionFailMessage);
            }
        }

        return hasPassed;
    }

}

export { Adventure };
