const inputBar = document.getElementById("input-bar");
const inputForm = document.getElementById("input");

import rooms from './rooms.json' assert {type: 'json'};
import itemList from './items.json' assert {type: 'json'};

import * as ui from './ui.js';

let command = "";
let currentRoom = "room001";
let commandArray = [];

const verbs = [
    "GO",
    "TAKE",
    "ON",
    "WITH",
    "ON",
];


inputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    getCommand();
});

function getCommand()
{
    command = inputBar.value.toUpperCase();
    ui.println(command);
    inputBar.value = "";
    tokenizeCommand();
}

function tokenizeCommand()
{
    let commandParts = command.split(" ");

    commandArray = [];

    commandArray.push(commandParts.shift());

    let verbString = "";

    let processing = true;
    while (processing === true) {

        let token = commandParts.shift();
        if (verbs.indexOf(token) === -1) {
            verbString += " " + token;
        } else {
            commandArray.push(verbString.trim());
            verbString = "";
            commandArray.push(token);
        }

        if (!commandParts.length) {
            if (verbString.length) {
                commandArray.push(verbString.trim());
            }
            processing = false;
        }
    }

    if (commandArray[0] === "HELP") {
        ui.println(["List of commands:",
        "GO: move to a location e.g. 'GO NORTH'",
        "LOOK: examine an item, e.g. 'LOOK CHEST'",
        "TAKE: take an item from the room, e.g. 'TAKE BUCKET OF DESTINY'",
        "INVENTORY: show what you are currently carrying"]);
        
        return;
    }

    switch(commandArray[0]) {
        case 'GO':
            doGo();
            break;
        case 'TAKE':
            doTake();
            break;
        case 'DROP':
            doDrop();
            break;
        case 'INVENTORY':
            doInventory();
            break;
        case 'USE':
            doUse();
            break;
        case "LOOK":
            doLook();
            break;
        case 'DEBUG':
            doDebug();
            break;
    }
}

/**
 * describeRoom - write a room description. Uses the rooms list and the descriptio field
 * for the initial text. Compiles a list of objects which are in the room
 */
function describeRoom()
{
    ui.clearscreen();
    ui.println(rooms[currentRoom].description);

    let roomItems = getRoomInventory();

    if (roomItems.length) {
        ui.println(["In the room, you can see:"]);

        let itemNames = [];

        roomItems.forEach(item => {
            itemNames.push(item);
        });

        ui.printlist(itemNames);
    }

    if (typeof(rooms[currentRoom].exits) != null && rooms[currentRoom].exits.length) { 
            rooms[currentRoom].exits.forEach((exit) => {
                if (exit.door) {
                    let door = getItemById(exit.door);
                    if (door.isActive) {
                        ui.println(door.description);
                    } else {
                        ui.println(exit.description)
                    }
                } else {
                    ui.println(exit.description);
                }
            });
    }
}

// doGo, transition from one room to another. Changes the currentRoom variable, but also checks for
// locked doors which are in the way of hte player.
// TODO - Move the locked doors stuff into its own function.
function doGo() {
    let direction = commandArray[1];
    let foundRoom = false;

    rooms[currentRoom].exits.forEach((exit) => {

        if (exit.name === direction) {
            foundRoom = true;
            if (exit.door) {
                let door = getItemById(exit.door);
                if (door.locked) {
                    ui.println(door.description);
                } else {
                    currentRoom = exit.destination;
                    describeRoom();
                }
            } else {
                currentRoom = exit.destination;
                describeRoom();
            }
        }
    });

    if (foundRoom) return;

    ui.printrandom([
        "You cannot go that way.",
        "There is nothing here.",
        "Try another direction.",
    ]);
}

// doTake, transfer an object to the player inventory. Items in the player's inventory are
// just items tagged with the 'playerInventory' location.
function doTake() {
    let takeTarget = commandArray[1];
    let itemId = getItemIdByName(takeTarget);
    console.log(itemId);

    if (itemList[itemId] && itemList[itemId].location == currentRoom) {
        if (!itemList[itemId].isGrabbable) {
            ui.println("You cannot pick that up.")
        } else {
            itemList[itemId].location = "playerInventory";
            describeRoom();
        }
    } else {

        ui.printrandom([
            "You cannot take what is not there.",
            "You can't see that anywhere",
        ]);
    }
}

// doDrop - drop an item from the player inventory. Items in rooms are just items
// tagged with the current room id in their location.
function doDrop() {
    let dropTarget = commandArray[1];
    let itemId = getItemIdByName(dropTarget);

    if (itemList[itemId] && itemList[itemId].location == "playerInventory") {
        itemList[itemId].location = currentRoom;
        describeRoom();
    }
}

function doLook(){
    if (typeof(commandArray[1]) == 'undefined' || typeof(commandArray[1] == null)) {
        describeRoom();
    }
}

// 
function doInventory() {
    let inventory = getPlayerInventory();

    if (inventory.length) {
        ui.printlist(inventory);
    } else {
        ui.println("Your pockets are empty");
    }
}

/**
 * doUse - run the "use" command. The use command has four parameters:
 * The first verb, which is always 'use'
 * The 'object' - the item the player is using
 * The second verb, which can be something like 'on' or 'with' - we don't really care what this is as long as it's valid
 * The 'subject' - the thing the item is being used on
 * 
 * Rules for items are:
 *  - An item can only be used once (they are deactivated automatically after use)
 *  - An object and subject must be in the same room (either in the room or in the player inventory)
 * 
 * In theory, you could break both of these rules, but bad things would happen if you did.
 * @returns false
 */
function doUse()
{    
    /* 
        Check if the user has supplied an 'on' and a 'subject' - e.g.
        "use key on door"
        TODO - Tidy this up and check for valid use nouns ('on', 'with' etc)
    */
    if (!commandArray[2] || !commandArray[3]) {
        ui.println(["You must use 'something' on or with 'something'"]);
    }

    let object = getItemIdByName(commandArray[1]);
    let subject = getItemIdByName(commandArray[3]);

    // Check that these are valid items.
    if (!itemList[subject] || !itemList[object]) {
        ui.println("You cannot do that.");
        return;
    }

    // Make sure that the object is either in the room, or on the player.
    if (itemList[object].location !== "playerInventory" && itemList[object].location !== currentRoom) {
        ui.println("You do not have that.")
        return;
    }
    
    // Make sure that the subject is either in the room, or on the player.
    if (itemList[subject].location !== "playerInventory" && itemList[subject].location !== currentRoom) {
        ui.println("You do not have that.")
        return;
    }

    // Make sure we can actually use the object with the subject
    if (itemList[object]['use'][target] !== subject) {
        ui.printrandom([
            ["You cannot use that."]
        ]);

        return;
    }

    /*
    Every object in the game can have a set of 'mutations'. A mutation represents the items effect on
    another item in the game. For example, to open a door you would set the door's isActive state to false,
    but any property can be modified (as long as it is in the top tier of the object's properties).
    */
    for(let [itemId, mutations] of Object.entries(itemList[object]["use"])) {
        
        for (let [prop, val] of Object.entries(itemList[object]["use"][mutations][itemId])) {
            itemList[itemId][prop] = val;
        }
    }
}

function getItemIdByName(targetItem) {

    for (let [id, item] of Object.entries(itemList)) {
        if (item.name === targetItem) {
            if (item.isActive) {
                return id;
            }
        }
    }

    return "";
}

function getItemById(targetItem) {

    for (let [id, item] of Object.entries(itemList)) {
        if (id === targetItem) {
            if (item.isActive) {
                return item;
            }
        }
    }

    return "";
}

function getRoomInventory()
{
    var roomInventory = [];

    for (let [index, item] of Object.entries(itemList))
    {
        if (item.location === currentRoom && !item.isDoor && item.isActive) {
            roomInventory.push(item.description);
        }
    }

    return roomInventory;
}

function getPlayerInventory()
{
    var playerInventory = [];

    for (let [index, item] of Object.entries(itemList))
    {
        if (item.location === "playerInventory" && item.isActive) {
            playerInventory.push(item.name);
        }
    }

    return playerInventory;
}

function doDebug()
{
    logList();
}

function logList()
{
    console.log(itemList);
}

describeRoom(currentRoom, []);