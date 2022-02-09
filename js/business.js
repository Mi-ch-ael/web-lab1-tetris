let nextField;
let gameField;
let nextFigure;
let gameFigure;

class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

const tetraminos = [
    [new Point(-1, 0), new Point(0, -1), new Point(1, 0)],
    [new Point(-1, 0), new Point(-1, -1), new Point(1, 0)],
    [new Point(-1, 0), new Point(1, -1), new Point(1, 0)],
    [new Point(-1, 0), new Point(1, 0), new Point(2, 0)],
    [new Point(-1, -1), new Point(0, -1), new Point(1, 0)],
    [new Point(-1, 0), new Point(0, -1), new Point(1, -1)],
    [new Point(0, -1), new Point(1, -1), new Point(1, 0)]
];

function storeUsername(source) {
    const defaultUsername = "User";
    localStorage["tetris.username"] = (source.value ? source.value : defaultUsername);
}

function retrieveUsername() {
    return localStorage["tetris.username"];
}

function displayUsername(element) {
    element.innerText = `${retrieveUsername()}`;
}

function init() {
    nextField =
        createField(document.getElementById("canvasNext"), 5, 2, "#000000");
    gameField =
        createField(document.getElementById("canvasGame"), 10, 20, "#202020");
    nextFigure = createFigure(nextField, 2, 1);
    nextFigure.attach();
    gameFigure = createFigure(gameField, 4, 1);
    gameFigure.attach();

    localStorage["level"] = "1";
    document.getElementById("score").innerText = "0";
    document.getElementById("level").innerText = "1";

    document.addEventListener("keydown", (event) => {
        const keyname = event.key;
        if([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(keyname) > -1){
            event.preventDefault();
        }
        switch (keyname) {
            case "ArrowLeft":
                gameFigure.move(-1);
                break;
            case "ArrowRight":
                gameFigure.move(1);
                break;
            case "ArrowUp":
                gameFigure.rotate(true);
                break;
            case "ArrowDown":
            case " ":
                gameFigure.drop();
                break;
            case "Shift":
                if(event.code === "ShiftLeft") gameFigure.rotate(false);
                break;
            case "Escape":
                pauseGame();
                break;
            default:
        }
    } );

    setTimeout(handleTimer, 1000);
}

function endGame() {
    alert(`Game over! Score: ${document.getElementById("score").innerText}`);
    updateHighscores();
    window.location = "https://localhost/highscores.html";
}

function pauseGame() {
    alert("Paused");
}

function updateScore(added) {
    let prev = document.getElementById("score").innerText;
    let score = parseInt(prev);
    if(isNaN(score)) score = 0;
    document.getElementById("score").innerText = (score + added).toString();
}

function updateLevel() {
    let score = parseInt(document.getElementById("score").innerText);
    localStorage["level"] = (Math.floor(score/1000) + 1).toString();
    document.getElementById("level").innerText = localStorage["level"];
}

function handleTimer() {
    let result = gameFigure.fall();
    if(result !== undefined) {
        updateScore(result);
        updateLevel();
        nextFigure.detach();
        if(!nextFigure.reassign(gameField, 4, 1)) {
            endGame();
        }
        gameFigure = nextFigure;
        gameFigure.attach();
        nextFigure = createFigure(nextField, 2, 1);
        nextFigure.attach();
    }

    let lvl = parseInt(localStorage["level"]);
    let time = Math.floor(1000 * Math.pow(0.8, (lvl-1)));  // (lvl-1)/2
    setTimeout(handleTimer, time);
}

function updateHighscores() {
    const highscores = (localStorage["highscores"] === undefined ? [] : JSON.parse(localStorage["highscores"]));
    ins(highscores, {
        username: retrieveUsername(),
        score: parseInt(document.getElementById("score").innerText)
    });
    localStorage["highscores"] = JSON.stringify(highscores);
}

function displayHighscores() {
    const tableSize = document.getElementById("highscoreTable").tBodies[0].rows.length;
    const highscores = (localStorage["highscores"] === undefined ? [] : JSON.parse(localStorage["highscores"]));

    if(highscores.length > tableSize) highscores.pop();
    for(let i = 0; i < tableSize; ++i) {
        document.getElementById(`username#${i}`).innerText =
            (highscores[i] === undefined ? "N/A" : highscores[i].username);
        document.getElementById(`highscore#${i}`).innerText =
            (highscores[i] === undefined ? "N/A" : highscores[i].score.toString());
    }
}

function ins(arr, val) {
    // arr.push(undefined);
    for(let i = arr.length - 1;;--i) {
        if(arr[i] === undefined || arr[i].score >= val.score) {
            arr[i+1] = val;
            break;
        }
        arr[i+1] = arr[i];
    }
}

function min(a, b) {
    return (a < b ? a : b);
}

function createField(canvas, width, height, color) {
    if(!canvas.getContext) return;
    let w = canvas.width;
    let h = canvas.height;
    let lineThickness = 2;

    let side = min(Math.floor( (w-(width+1)*lineThickness) / width),
            Math.floor( (h-(height+1)*lineThickness)/height ));

    let ctx = canvas.getContext('2d');
    ctx.lineWidth = lineThickness;
    ctx.fillStyle = (color === undefined ? "#808080" : color);
    for(let i = 0; i <= width; ++i) {
        ctx.fillRect(i*(side+lineThickness), 0, lineThickness, height*(side+lineThickness)+1);
    }
    for(let i = 0; i <= height; ++i) {
        ctx.fillRect(0, i*(side+lineThickness), width*(side+lineThickness), lineThickness);
    }

    // create hidden fields
    const _lineThickness = lineThickness;
    const _side = side;
    const _ctx = ctx;

    let _data = new Array(height);
    for(let i = 0; i < height; ++i) {
        _data[i] = new Array(width);
        for(let j = 0; j < width; ++j) {
            _data[i][j] = "";
        }
    }

    const _width = width;
    const _height = height;

    return {
        getWidth () {
            return _width;
        },

        getHeight() {
            return _height;
        },

        getCell(x, y) {
            return _data[y][x];
        },

        setCell(x, y, value) {
            _data[y][x] = value;
        },

        checkRow(y) {
            const FULL = 1;
            const FREE = -1;
            const OTHER = 0;

            let freePossible = true;
            let fullPossible = true;

            for(let i = 0; i < _width; ++i) {
                if(_data[y][i]) freePossible = false;
                if(!_data[y][i]) fullPossible = false;
                if(!freePossible && !fullPossible) return OTHER;
            }
            if(freePossible) return FREE;
            if(fullPossible) return FULL;
        },

        shiftRows(yStart) {
            for(let y = yStart; y >= 1; --y) {
                for(let x = 0; x < _width; ++x) {
                    _data[y][x] = _data[y-1][x];
                }
            }
            for(let x = 0; x < _width; ++x) {
                _data[0][x] = "";
            }
        },

        putSquare(x, y) {
            if(!this.getCell(x, y)) {
                _ctx.clearRect( (x+1)*_lineThickness + x*_side, (y+1)*_lineThickness + y*_side,
                    _side, _side);
                return;
            }
            _ctx.fillStyle = this.getCell(x, y);
            _ctx.fillRect((x+1)*_lineThickness + x*_side, (y+1)*_lineThickness + y*_side,
                _side, _side);
        },

        repaint() {
            for(let i = 0; i < _width; ++i) {
                for(let j = 0; j < _height; ++j) {
                    this.putSquare(i, j);
                }
            }
        }
    };
}

function createFigure(field, x, y) {
    let _field = field;
    const colors = ["#00FF55", "#20A020", "#00CC00", "#00AA00", "#60CC60", "#00FF00", "#008000"];

    let number = Math.floor(tetraminos.length*Math.random());
    const _color = colors[number];

    const _basePoint = new Point(x, y);
    let _offsets = [];
    for(let elem of tetraminos[number]) {
        _offsets.push(elem);
    }

    if(number === 7) console.log(_offsets);

    let _rotatable = (number !== 6);

    function _getColumns() {
        let pointArray = _getPoints(_basePoint, _offsets);
        let columns = [];
        pointArray.forEach( function(point) {
            let column = columns[point.x];
            if(!column) {
                columns[point.x] = [];
            }
            columns[point.x].push(point);
        } );
        return columns.filter(elem => elem);
    }

    function _isValid(points) {
        for(let i = 0; i < points.length; ++i) {
            let point = points[i];
            if(point.x < 0 || point.x >= _field.getWidth()) return false;
            if(point.y < 0 || point.y >= _field.getHeight()) return false;
            if(_field.getCell(point.x, point.y)) return false;
        }
        return true;
    }

    function _getPoints(basePoint, offsets) {
        let result = [basePoint];
        for(let offset of offsets) {
            result.push(new Point(basePoint.x + offset.x, basePoint.y + offset.y));
        }
        return result;
    }

    return {
        fall() {
            const scores = [0, 100, 300, 500, 800];
            let rowsDeleted = 0;
            if(!this.hasFallen()) {
                this.detach();
                _basePoint.y += 1;
                this.attach();
                return undefined;
            }

            for(let y = 0; y < _field.getHeight(); ++y) {
                if(_field.checkRow(y) === 1) {
                    _field.shiftRows(y);
                    ++rowsDeleted;
                }
            }
            _field.repaint();
            return scores[rowsDeleted];
        },

        hasFallen() {
            for(let elem of _getPoints(_basePoint, _offsets)) {
                if(elem.y === _field.getHeight() - 1) return true;
            }

            let distributed = _getColumns();
            let front = [];
            for(let array of distributed) {
                front.push(array.reduce( (max, point) => {
                    return (point.y > max.y ? point : max);
                }, array[0] ));
            }
            let checked = [];
            for(let elem of front) {
                checked.push(new Point(elem.x, elem.y + 1));
            }

            if(checked.reduce( (prev, curr) => {
                return prev || _field.getCell(curr.x, curr.y);
            } , false )) {
                return true;
            }
            return false;
        },

        drop() {
            this.detach();
            while(!this.hasFallen()) _basePoint.y += 1;
            this.attach();
        },

        move(xShift) {
            this.detach();
            let predictedPoint = new Point(_basePoint.x + xShift, _basePoint.y);
            if(_isValid(_getPoints(predictedPoint, _offsets))) {
                _basePoint.x = predictedPoint.x;
                _basePoint.y = predictedPoint.y;
            }
            this.attach();
        },

        rotate(rotateRight = true) {
            if(!_rotatable) return;
            this.detach();
            let predictedOffsets = [];
            for(let i = 0; i < _offsets.length; ++i) {
                if(rotateRight) {
                    predictedOffsets.push(new Point(-1 * _offsets[i].y, _offsets[i].x));
                }
                else {
                    predictedOffsets.push(new Point(_offsets[i].y, -1*_offsets[i].x))
                }
            }
            if(_isValid(_getPoints(_basePoint, predictedOffsets))) {
                _offsets = predictedOffsets;
            }
            this.attach();
        },

        detach() {
            for(let elem of _getPoints(_basePoint, _offsets)) {
                _field.setCell(elem.x, elem.y, "");
                _field.putSquare(elem.x, elem.y);
            }
        },

        attach() {
            for(let elem of _getPoints(_basePoint, _offsets)) {
                _field.setCell(elem.x, elem.y, _color);
                _field.putSquare(elem.x, elem.y);
            }
        },

        reassign(assignedField, xStart, yStart) {
            _field = assignedField;
            _basePoint.x = xStart;
            _basePoint.y = yStart;
            return _isValid(_getPoints(_basePoint, _offsets));
        },

        /*isValidTest() {
            return _isValid(_getPoints(_basePoint, _offsets));
        }*/

    };
}