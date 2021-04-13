class SOWL_System {
    //CONFIG.debug.hooks = true;
    constructor() {
        this._puzzleController = null;
        this._animationStack = new Object();
        this._globalCallID = 0;
        Hooks.on("SOWL_animationDone", this._SOWL_enablePuzzle.bind(this));

        //traps
        this._pitTrap = {
            img: "/modules/SOWL-shared-lib/assets/pearl_blue.png"
        }
    };

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    _arrayRemove(arr, value) {
        return arr.filter(function (ele) {
            return ele != value;
        });
    }

    _testForLight(point, { tolerance = 2, object = null } = {}) {
        // Determine the array of offset points to test
        var tolerance = Math.min(point.w, point.h) / 4;
        const t = tolerance;
        //point = point.center

        //console.log(point)

        const offsets = t > 0 ? [[0, 0], [-t, 0], [t, 0], [0, -t], [0, t], [-t, -t], [-t, t], [t, t], [t, -t]] : [[0, 0]];
        const points = offsets.map(o => new PIXI.Point(point.x + o[0], point.y + o[1]));
        //console.log(points);
        var lightOnToken = [];

        // Logging map object to console
        canvas.lighting.sources.forEach((value, key) => {
            //console.log(value + " = " + key);
            var isHit = points.some(p => value.illumination.fov.geometry.containsPoint(p))
            //console.log(isHit);
            if (isHit) {
                var hitter = key.split(".")[1]
                //console.log(hitter)
                //lightOnToken.push(key.split(".")[1])
                lightOnToken.push(canvas.tokens.placeables.filter(x => x.data._id.includes(hitter))[0]);
            }
        })

        if (lightOnToken.length > 0) {
            return lightOnToken;
        } else {
            return false;
        }
    }

    _testForLightBy(point, listOfSources) {
        // Determine the array of offset points to test
        var tolerance = Math.min(point.w, point.h) / 4;
        const t = tolerance;
        //point = point.center

        //console.log(point)

        const offsets = t > 0 ? [[0, 0], [-t, 0], [t, 0], [0, -t], [0, t], [-t, -t], [-t, t], [t, t], [t, -t]] : [[0, 0]];
        const points = offsets.map(o => new PIXI.Point(point.x + o[0], point.y + o[1]));
        //console.log(points);
        var lightOnToken = [];

        //console.log("SOURCES")
        //console.log(listOfSources)
        //console.log("------")

        // Logging map object to console
        listOfSources.forEach((value, key) => {
            //console.log(value + " = " + key);
            var isHit = points.some(p => value.light.illumination.fov.geometry.containsPoint(p))
            //console.log(isHit);
            if (isHit) {
                //var hitter = value
                console.log("is hit by")
                console.log(value.name)
                //lightOnToken.push(key.split(".")[1])
                lightOnToken.push(value);
            }
        })

        //console.log(lightOnToken)
        if (lightOnToken.length > 0) {
            return lightOnToken;
        } else {
            return false;
        }
    }

    _copyLightProperties(lightSource, target) {
        //console.log(lightSource[0].data)
        var light = lightSource[0].data;
        target.update({
            //vision: light.vision,
            dimSight: light.dimSight,
            brightSight: light.brightSight,
            dimLight: light.dimLight,
            brightLight: light.brightLight,
            lightAngle: light.lightAngle,
            lockRotation: light.lockRotation,
            lightColor: light.lightColor,
            lightAlpha: light.lightAlpha
        });
    }

    _disableLight(target) {
        //console.log("delete light from")
        //console.log(target)
        target.update({
            //vision: light.vision,
            dimLight: 0,
            brightLight: 0
        });
    }

    _getAllNamedTokens() {
        let allTokens = canvas.tokens.placeables;
        let storageEntity = [];
        for (var a in allTokens) {
            if (typeof (allTokens[a]) == "object" && typeof (allTokens[a].data.actorData.name) != "undefined") {
                storageEntity.push(allTokens[a]);
            };
        };
        return storageEntity;
    };

    _getAllTiles() {
        let allTokens = canvas.tiles.placeables;
        let storageEntity = [];
        for (var a in allTokens) {
            if (typeof (allTokens[a]) == "object" && typeof (allTokens[a].data.actorData.name) != "undefined") {
                storageEntity.push(allTokens[a]);
            };
        };
        return storageEntity;
    };

    async _SOWL_rotateTokenBy(target, degrees, delayTimer, insideLoop, rotationCount, myCallID) {
        //if first run and not recursive turns
        if (!insideLoop) {
            //register for SOWL  animation stack
            var myCallID = this._SOWL_RegisterAnimator(target);
            //if no rotation needed wait before unregister to avoid pause bug
            if (degrees == 0) {
                await this._sleep(500);
                this._SOWL_UnRegisterAnimator(target)
                return;
            }
            //15 seems smooth enough and fits 45 degree angles
            var rotationCount = degrees / 15;
            degrees = degrees / rotationCount;
        }
        //if rotations left
        if (rotationCount != 0) {
            //if the same token was called with another animation, stop animations
            if (this._animationStack[target.data._id != myCallID]) {
                return;
            }
            //rotate
            await this._SOWL_rotateToken(target, degrees);
            await this._sleep(delayTimer);
            rotationCount--;
            //rotate again
            this._SOWL_rotateTokenBy(target, degrees, delayTimer, true, rotationCount, myCallID)
        } else if (rotationCount == 0) {
            //remove from SOWL animation stack
            this._SOWL_UnRegisterAnimator(target)
        }
    }

    async _SOWL_rotateToken(target, rotation) {
        var toRotate = target.data.rotation + rotation;
        // Tiles only rotate up to 360, so reset it if we exceed that
        if (toRotate >= 360) {
            toRotate = toRotate - 360;
        }
        await target.rotate(toRotate, 15);
    }

    _SOWL_rotateMeTo(target, rotationGoal, rotateSpeed) {
        let degreesToRotate = 0;
        let currentRotation = target.data.rotation;

        //stop if no rotation needed
        if (currentRotation == rotationGoal) { return; }

        //if goal is zero rotate to 360
        if (rotationGoal == 0) {
            degreesToRotate = 360 - currentRotation;
        } else {
            degreesToRotate = Math.abs(360 - currentRotation + rotationGoal);
        }
        //        console.log("--------------------");
        //        console.log(target + " currentRotation:" + currentRotation);
        //        console.log(target + " rotationGoal:" + rotationGoal);
        //        console.log(target + " degreesToRotate :" + degreesToRotate);
        //        console.log("--------------------");
        this._SOWL_rotateTokenBy(target, degreesToRotate, rotateSpeed);
    };

    _SOWL_RegisterAnimator(animator) {
        //get foundry ID of the animation target token/tiles
        var animatorID = animator.data._id
        //callID
        var newCallID = this._globalCallID
        this._globalCallID++
        //store which call ID belongs to this animation 
        this._animationStack[animatorID] = newCallID;
        //console.log("_SOWL_RegisterAnimator "+animatorID);
        //console.log(this._animationStack);
        //console.log("----");

        //if game is not paused, pause now
        if (!game.paused) {
            game.togglePause(true, true);
        }
        return newCallID;
    }

    _SOWL_UnRegisterAnimator(animator) {
        //get foundry ID of the animation target token/tile
        var animatorID = animator.data._id

        //remove myself from the active animation stack
        delete this._animationStack[animatorID];

        //if i was the last one
        if (Object.keys(this._animationStack).length == 0) {
            //unpause game
            if (game.paused) {
                game.togglePause(false, true);
            }
            //tell everyone they can continue
            Hooks.callAll("SOWL_animationDone");
        }
        //console.log("_SOWL_UnRegisterAnimator "+animatorID);
        //console.log(this._animationStack);
        //console.log("----");
    }

    _SOWL_enablePuzzle(controller) {
        //Hooks on SOWL_animationDone
        //Specific for the SOWL Puzzles, allows them in the scene macros to do checks again in multilevel tokens
        controller = this._puzzleController;
        if (controller != null) {
            controller.data.flags["SOWL"]["allowCheck"] = true;
        }
    }

    _SOWL_attachTile(region) {
        console.log(region);
        const tile = new Tile({
            img: this._pitTrap.img,
            width: region.scene.data.grid,
            height: region.scene.data.grid,
            x: region.x,
            y: region.y,
            z: 900,
            rotation: 0,
            hidden: false,
            locked: false,
            //flags: clock.flags
        });
        var pitItem = canvas.scene.createEmbeddedEntity('Tile', tile.data);
    }
};

class SOWL_RingPuzzle1 {
    constructor() {
        //Hooks.on("SOWL_animationDone", this._SOWL_enablePuzzle.bind(this));
    };

    _SOWL_resetPuzzleTrigger() {
        Hooks.once("SOWL_animationDone", this._SOWL_resetPuzzle.bind(this));
    }
    _SOWL_resetPuzzle() {
        game.LightSwitch.flipTheSwitchGM("ringPuzzleReset")
    }


}

class SOWL_MirrorPuzzle1 {
    constructor() {
        Hooks.on("sightRefresh", this._calculateMirrors.bind(this));
        //        Hooks.on("sightRefresh", this._calculateReceiver.bind(this));
        Hooks.on("lightingRefresh", this._calculateMirrors.bind(this));
        //        Hooks.on("lightingRefresh", this._calculateReceiver.bind(this));
        this.SOWL_Mirrors = new Array();
        this.SOWL_Receiver = new Array();
        this.SOWL_Emitter = new Array();
    };

    _addMirror(token) {
        this.SOWL_Mirrors.push(token)
    }

    _deleteMirror(token) {

    }

    _addReceiver(token) {
        this.SOWL_Receiver.push(token)
    }

    _deleteReceiver(token) {

    }

    _addEmitter(token) {
        this.SOWL_Emitter.push(token)
    }

    _deleteEmitter(token) {

    }

    /*
        _calculateMirrors() {
            console.log("Calculating Mirrors")
            //console.log(this.SOWL_Mirrors)
            var mirrors = this.SOWL_Mirrors
            if (mirrors.length == 0) {
                return;
            }
            //console.log(mirrors)
            for (var key in mirrors) {
                //console.log(typeof (mirrors[key]))
    
                if (typeof (mirrors[key]) == "object") {
                    var islit = game.SOWL._testForLight(mirrors[key].center);
                    //console.log(mirrors[key].center)
                    if (islit) {
                        console.log("activate mirror")
                        game.SOWL._copyLightProperties(islit, mirrors[key])
                    } else if (mirrors[key].emitsLight) {
                        console.log("deactivate mirror")
                        //console.log(mirror)
                        game.SOWL._disableLight(mirrors[key]);
                    }
                }
    
            }
            this._calculateReceiver()
        }
    */

    _calculateMirrors() {
        console.log("Calculating Mirrors")
        //console.log(this.SOWL_Mirrors)
        var mirrors = this.SOWL_Mirrors
        if (mirrors.length == 0) {
            return;
        }
        //console.log(mirrors)
        for (var key in mirrors) {
            //console.log(typeof (mirrors[key]))

            if (typeof (mirrors[key]) == "object") {
                //var islit = game.SOWL._testForLight(mirrors[key].center);
                var islit = game.SOWL._testForLightBy(mirrors[key].center, this.SOWL_Emitter);
                //console.log(mirrors[key].center)
                if (islit) {
                    console.log("activate mirror")
                    game.SOWL._copyLightProperties(islit, mirrors[key])
                } else if (mirrors[key].emitsLight) {
                    console.log("------------>deactivate mirror")
                    //console.log(mirror)
                    game.SOWL._disableLight(mirrors[key]);
                }
            }

        }
        this._calculateReceiver()
    }

    _activateReceiver(target) {
        //console.log(lightSource[0].data)
        target.update({
            //vision: light.vision,
            dimLight: 2,
            brightLight: 0
        });
    }

    _calculateReceiver() {
        console.log("Calculating Receivers")
        //console.log(this.SOWL_Mirrors)
        var receiver = this.SOWL_Receiver
        if (receiver.length == 0) {
            return;
        }
        //console.log(mirrors)
        for (var key in receiver) {
            //console.log(typeof (receiver[key]))

            if (typeof (receiver[key]) == "object") {
                var islit = game.SOWL._testForLightBy(receiver[key].center, this.SOWL_Mirrors);
                //console.log(mirrors[key].center)
                //console.log(receiver[key])
                if (islit) {
                    console.log("activate receiver")
                    this._activateReceiver(receiver[key])
                } else if (receiver[key].emitsLight) {
                    console.log("------------->deactivate receiver")
                    game.SOWL._disableLight(receiver[key]);
                }
            }

        }
    }


    _SOWL_getLightSourcesOnMe(token) {
        tokenIsLit = token._testForLight()
        if (tokenIsLit) {

        }
    }

}

Hooks.on('init', () => game.SOWL = new SOWL_System());
Hooks.on('init', () => game.SOWL_RingPuzzle1 = new SOWL_RingPuzzle1());
Hooks.on('init', () => game.SOWL_MirrorPuzzle1 = new SOWL_MirrorPuzzle1());