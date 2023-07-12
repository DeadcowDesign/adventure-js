# ADVENTURE-JS

## Current status
Adventure JS is a hobby project, and is currently in Alpha. Not all features may work, and some features are yet to be implemented. Users may experience issues with save game corruption, feature changes, and incompatibility between versions as the program is developed.

## What is adventure JS
Adventure-js is a text adventure framework written in pure Javascript. It is designed to be relatively easy to script for (using a syntax called JSON), while remaining powerful and flexible. Adventure JS has built in systems managing rooms, doors, inventory items. Adventure Puzzles are created using a system called 'mutation', which allows writers to change almost any property on any item in the game directly from the item structure. Mutations are very flexible and powerful, enabling multi-level, complex, puzzles to be created.

In addition, Adventure JS leverages browser local storage to enable automatic local saving of data. Every action performed that affects the game data is written to the user's local storage, enabling them to pick their game back up where they left off.

Adventure JS also uses a flexible command system. While there are only a small number of commands in the game itself, these can be referred to by a number of flexible verbs which can be used as aliases for the various game functions, and are defined in the game meta file.
