
function GameView(){
    let canvas = document.getElementById("game_canvas");
    let canvas_container = document.getElementById("canvas_container");

    let stage = new createjs.Stage("game_canvas");
    let ground_level;
    let dig_counter = 0;

    let eventHandlers = {
        clickground: null,
        requestSelectedTool: null
    };

    stage.enableMouseOver(10);
    createjs.Touch.enable(stage);
    createjs.Ticker.addEventListener("tick", stage);
    createjs.Ticker.setFPS(60);

    Object.defineProperties(this, {
        stage: {
            get: function(){
                return stage;
            },
        },
        onclickground: {
            set: function(val){
                eventHandlers.clickground = val;
            }
        },
        onRequestSelectedTool: {
            set: function(val){
                eventHandlers.requestSelectedTool = val;
            }
        },
        dig_counter: {
            get: function() {
                return dig_counter;
            },
            set: function(val){
                dig_counter = val;
            }
        }
    });

    this.stage.on("mousedown", function(event){
        stage.offset = {
            x: stage.x - event.stageX,
            y: stage.y - event.stageY
        };
    });

    this.stage.on("pressmove", function(event){
        if (eventHandlers.requestSelectedTool)
            if (eventHandlers.requestSelectedTool() !== "grab")
                return;

        let tmpX = event.stageX + stage.offset.x;
        let tmpY = event.stageY + stage.offset.y;

        if(tmpX >= map.startX + map.padding || window.innerWidth - tmpX >= map.endX + map.padding)
            tmpX = stage.x;

        if(tmpY >= map.startY + map.padding || window.innerHeight - tmpY >= map.endY + map.padding)
            tmpY = stage.y;

        stage.x = tmpX;
        stage.y = tmpY;
    });

    let createSprite = function(images) {
        if (!Array.isArray(images))
            images = [images];
        let imgs = images.map(item => textures[item]);
        let shape = new createjs.Sprite( new createjs.SpriteSheet({
            images: imgs,
            frames: {width: imgs[0].width, height: imgs[0].height}
        }) );
        return shape;
    }

    let convert_to_shape = function(source){
        let shape;

        switch(source.type){
            case "detail":
                shape = createSprite(source.textures);
                if (source.click_sounds) {
                    shape.addEventListener("click", function() {
                       console.log(createjs.Sound.play(source.click_sounds[ Math.floor(Math.random() * source.click_sounds.length) ]));
                    });
                }
                console.log(shape);
                // set x, y
                shape.x = source.x;
                shape.y = source.y;
                shape.framerate = source.framerate;
                shape.play();
                break;
            case "ground":
                shape = new createjs.Shape();
                shape.graphics.beginBitmapFill(textures[source.texture], "repeat").drawRect(source.x, source.y, source.w, source.h);
                shape.addEventListener("click", function(){
                    if(eventHandlers.clickground)
                        if (eventHandlers.clickground({
                            mapX: -stage.offset.x,
                            mapY: -stage.offset.y
                        }) === "not shovel")
                            return;

                    let dig = createSprite(source.dig_texture);
                    dig.x = -stage.offset.x -50;
                    dig.y = -stage.offset.y -50;
                    stage.addChild(dig);
                    stage.setChildIndex(dig, ground_level+1 + dig_counter++);
                    console.log('dig count: ', dig_counter);
                    storage.setItem("dig_counter", dig_counter);
                });
                console.log('ground level: ', stage.getNumChildren());
                ground_level = stage.getNumChildren();
                break;
        }

        return shape;
    };

    this.load_map = function(map){

        //MAP frame
        let frame_shape = new createjs.Shape();
        frame_shape.graphics.beginBitmapFill(textures[map.frame_material]).drawRect(map.startX - map.padding, map.startY - map.padding, map.endX + map.padding*2, map.padding).drawRect(map.startX - map.padding, map.endY, map.endX + map.padding*2, map.padding).drawRect(map.startX - map.padding, map.startY, map.padding, map.endY + map.padding*2).drawRect(map.endX, map.startY, map.padding, map.endY + map.padding*2);
        this.stage.addChild(frame_shape);

        //creates graphic instance for gradient
        let tmp_gradient = new createjs.Shape();

        //Gradient TOP
        tmp_gradient.graphics.beginLinearGradientFill(["#000","transparent"], [0.1, 1], 0, -map.padding, 0, 0).drawRect(map.startX - map.padding, map.startY - map.padding, map.endX + map.padding*2, map.padding);
        //Gradient BOTTOM
        tmp_gradient.graphics.beginLinearGradientFill(["transparent", "#000"], [0.1, 1], 0, map.endY, 0, map.endY + map.padding).drawRect(map.startX - map.padding, map.endY, map.endX + map.padding*2, map.padding);
        //Gradient LEFT
        tmp_gradient.graphics.beginLinearGradientFill(["#000","transparent"], [0.1, 1], -map.padding, 0, 0, 0).drawRect(map.startX - map.padding, map.startY - map.padding, map.padding, map.endY + map.padding*2);
        //Gradient RIGHT
        tmp_gradient.graphics.beginLinearGradientFill(["transparent", "#000"], [0.1, 1], map.endX, 0, map.endY + map.padding, 0).drawRect(map.endX, map.startY - map.padding, map.padding, map.endY + map.padding*2);

        //adding gradient
        this.stage.addChild(tmp_gradient);

        //MAP shapes
        for(let i=0; i < map.shapes.length; i++)
            this.stage.addChild(convert_to_shape(map.shapes[i]));

        this.stage.x = -map.startX - map.endX/2 + window.innerWidth/2;
        this.stage.y = -map.startY - map.endY/2 + window.innerHeight/2;

        createjs.Sound.play(map.ambient_sound, {loop: -1});
    };

    let resize_canvas = function(){
        canvas.width = canvas_container.offsetWidth;
        canvas.height = canvas_container.offsetHeight;
    };
    window.addEventListener("resize", resize_canvas);
    resize_canvas();

    let textures = {};

    this.loadResources = function(callback){
        console.log("Loading resources.", callback);

        new createjs.FontLoader("/sources/fonts/iknowaghost.ttf").load();

        const resource_count = texture_paths.length + sounds.length;
        let load_count = 0;
        let preload = new createjs.LoadQueue();
        preload.addEventListener("fileload", function(event){
            load_count++;

            let name = event.item.src.substring(event.item.src.lastIndexOf("/")+1);
            name = name.substring(0, name.lastIndexOf("."));

            console.log("Texture '"+ name +"' loaded.");

            textures[name] = event.result;

            if(load_count === resource_count)
                callback();
        });

        createjs.Sound.addEventListener("fileload", function(event){
            load_count++;

            console.log("Sound '"+ event.id +"' loaded.");

            if(load_count === resource_count)
                callback();
        });

        //loading textures
        for(let i=0; i<texture_paths.length; i++)
            preload.loadFile(texture_paths[i]);

        //loading sounds
        for(let i=0; i<sounds.length; i++) {
            let name = sounds[i].substring(sounds[i].lastIndexOf("/") + 1);
            name = name.substring(0, name.lastIndexOf("."));

            createjs.Sound.registerSound(sounds[i], name);
        }
    };
}