const hidden_item_radius = 100;

// todo: game over, mentes (...camera allas), nagy mozgatasnal ne asson

class Game{

    view;
    welcome_hint = {
        type: "hint",
        name: "asdasd",
        value: "asdasdasdasd asdasasda sdasdas",
        pos: {x: 150, y: 300}
    };

    inventory = [this.welcome_hint];
    selected_tool = "grab"; // grab, shovel, none
    selected_item_index;
    hidden_items = [];

    // stats related
    start_time;
    end_time;
    prev_session_time;

    constructor() {
        document.getElementById("button_" + this.selected_tool).classList.add("selected");

        this.view = new GameView();

        this.view.onclickground = (pos) => {
            console.log('on click at: ', pos)

            // return if the shovel is not selected
            if (this.selected_tool !== "shovel")
                return "not shovel";

            console.log('checking if item hidden item clicked')
            for (let i = 0; i < this.hidden_items.length; i++) {
                if (Game.isPointInRect(pos, this.hidden_items[i].pos, hidden_item_radius, hidden_item_radius)) {
                    console.log('found item: ', this.hidden_items[i])

                    // add item to inventory and remove from hidden_items
                    this.inventory.unshift( this.hidden_items.splice(i, 1).pop() ) ;
                    storage.setItem("hint", this.inventory[0]);
                    if (this.inventory[0].type === "final") {
                        // this.end_time = new Date();
                        storage.removeItem("hint");
                        this.gameOver();
                    }
                    break;
                }
            }
            console.log('inventory: ', this.inventory)
            console.log('hidden_items: ', this.hidden_items)
            // this.view.dig_counter++;
        }

        this.view.onRequestSelectedTool = () => {
            return this.selected_tool;
        }

        this.view.dig_counter = 0;
        this.inventory = [this.welcome_hint];
        this.prev_session_time = 0;

        if (storageAvailable("sessionStorage")) {
            if (storage.getItem('dig_counter')) this.view.dig_counter = storage.getItem('dig_counter');
            if (storage.getItem('hint')) this.inventory = storage.getItem('hint');
            if (storage.getItem('prev_session_time')) this.prev_session_time = storage.getItem('prev_session_time');
        } else {
            console.log("session not available")
        }
    }

    start(){

        this.view.loadResources(() => {
            this.view.load_map(map);
            console.log("Map loaded.");

            this.loadHiddenItems();
        });

        // this.view.dig_counter = 0;
        this.start_time = new Date();
    };

    loadHiddenItems() {
        this.hidden_items = map.hidden_items;
        // console.log('hidden items loaded')
    }

    static isPointInRect(pos, rectPos, rectW, rectH) {
        return (pos.mapY > rectPos.y) && (pos.mapY < rectPos.y + rectH) && (pos.mapX > rectPos.x) && (pos.mapX < rectPos.x + rectW);
    }

    onInventoryClicked(index) {
        console.log('inventory clicked at: ', index);

        switch (index) {
            case 0:
                this.changeSelected("grab", this.selected_item_index);
                break;
            case 1:
                this.changeSelected("shovel", this.selected_item_index);
                break;
            default:
                this.changeSelected("none", index-2);
                console.log('selected hint at: ', this.selected_item_index);

                this.showHint( this.inventory[this.selected_item_index] );
                break;
        }
    }

    changeSelected(selected, index) {
        if (this.selected_tool !== "none") {
            document.getElementById("button_" + this.selected_tool).classList.remove("selected");
        } else {
            document.getElementById("button_item_" + this.selected_item_index.toString()).classList.remove("selected");
        }

        this.selected_tool = selected;
        this.selected_item_index = index;

        if (this.selected_tool !== "none") {
            document.getElementById("button_" + this.selected_tool).classList.add("selected");
        } else {
            document.getElementById("button_item_" + this.selected_item_index.toString()).classList.add("selected");
        }
    }

    showHint(hint) {
        document.getElementById("tale_name").innerHTML = hint.name;
        document.getElementById("tale_value").innerHTML = hint.value;
        document.getElementById("tale_popup").classList.add("show");
    }

    closeHint() {
        document.getElementById("tale_popup").classList.remove("show");
        // select grab
        this.changeSelected("grab", this.selected_item_index);
    }

    createStats() {
        let tries = this.view.dig_counter;
        this.end_time = new Date();
        let time = ((this.end_time - this.start_time) + this.prev_session_time)/1000;
        let seconds = Math.trunc(time)%60;
        let minutes = Math.trunc(time/60);

        return {
            timestamp: Math.round(this.end_time.getTime()/1000),
            tries: tries,
            time: `${minutes}:${seconds}`,
            score: Math.trunc((1.0/time)*10000 + (1/Math.max(tries, 1)) * 10000)
        }
    }

    saveSession() {
        console.log('saving session ...');
    }

    gameOver() {
        console.log("GAME OVER");

    }
}

let isFullScreen = false;
function toggleFullScreen() {
    if (isFullScreen) {
        document.getElementById("full-screen-control").classList.remove("in");
        document.getElementById("full-screen-control").classList.add("out");
        isFullScreen = false;
        document.exitFullscreen();
    } else {
        document.getElementById("full-screen-control").classList.remove("out");
        document.getElementById("full-screen-control").classList.add("in");
        isFullScreen = true;
        document.body.requestFullscreen();
    }
}

let storage;
function storageAvailable(type) {
    try {
        storage = window[type];
        let x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
                // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

const game = new Game();
game.start();