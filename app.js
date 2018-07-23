const CELL_EMPTY = 0;
const CELL_APPLE = -1;
const CELL_SNAKE = 1;

const DIRECTION_UP    = 'ArrowUp';
const DIRECTION_RIGHT = 'ArrowRight';
const DIRECTION_DOWN  = 'ArrowDown';
const DIRECTION_LEFT  = 'ArrowLeft';
const DIRECTION_CODES = [DIRECTION_UP, DIRECTION_RIGHT, DIRECTION_DOWN, DIRECTION_LEFT]


// - - - - - Point Class - - - - - //
class Point {
  constructor(x, y, size, options) {
    const {validates, wrap} = (options || {})
    this.size = size;
    this.x = wrap ? this.wrap(x) : x;
    this.y = wrap ? this.wrap(y) : y;
    if( options.validates && this.isOutOfBounds() )
      throw 'Out of bounds';
  }

  wrap(value) {
    return (value + this.size) % this.size;
  }

  getIndex() {
    return this.x + (this.y * this.size);
  }

  isOutOfBounds() {
    const {x, y, size} = this;
    return ( x < 0 || x >= size || y < 0 || y >= size);
  }

  equals(otherPoint) {
    return (this.x === otherPoint.x) && (this.y === otherPoint.y)
  }

  toString() {
    return `X: ${this.x}, Y: ${this.y}`
  }
}


// - - - - - Snake Class - - - - - //
class Snake {
  constructor(settings = {}) {
    this.rebind();
    this.settings = this.initSettings(settings);
    this.pointOptions = this.getPointOptions();
    this.gridElement = this.initGrid();
    this.board = this.initBoard();
    this.snake = [];
    this.initSnake();
    this.apple = this.generateApple();
    this.keyListener = document.addEventListener('keyup', this.onKeyPress);
    this.moveInterval = setInterval(this.onTick, this.settings.interval);
    this.paused = true;
    this.setScore(0);
  }

  initSettings(settings) {
    return {
      columns: 10,
      interval: 150,
      version: 1,
      onGameOver: null,
      ...settings
    }
  }

  getPointOptions() {
    if( this.settings.version.toString() === '2' )
      return {wrap: true};
    else
      return {validates: true};
  }

  rebind() {
    ['onKeyPress', 'onTick', 'onClick'].forEach( fnName => this[fnName] = this[fnName].bind(this) )
  }

  initGrid() {
    const {columns} = this.settings, nbCols = columns * columns;
    const grid = document.getElementById('grid');
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${columns}, 1fr)`;
    for(let i = 0; i < nbCols; i++) {
      const node = document.createElement('div');
      grid.appendChild(node);
    }
    document.addEventListener('click', this.onClick);
    return grid;
  }

  initBoard() {
    const board = [], {columns} = this.settings, nbCols = columns * columns;
    board.length = nbCols;
    for(let i = 0; i < nbCols; i++)
      board[i] = CELL_EMPTY;
    return board;
  }

  initSnake() {
    const {columns} = this.settings;
    const y = columns - 2;
    for(let i = 1; i < 4; i++)
      this.addSnakeHead(this.newPoint(i, y));
    this.direction = DIRECTION_RIGHT;
  }

  generateApple() {
    while(true) {
      const point = this.newPoint(this.randomCellIndex(), this.randomCellIndex());
      const index = point.getIndex();
      const value = this.board[index];
      if( value === CELL_EMPTY ) {
        this.markCell(point, CELL_APPLE);
        return point;
      }
    }
  }

  onKeyPress(e) {
    const code = e.code;
    if( DIRECTION_CODES.includes(code) ) {
      e.preventDefault();
      this.updateDirection(code);
    } else if( code === 'Space' ) {
      this.paused = !this.paused;
    }
  }

  onClick(e) {
    const {x, y, view: {innerWidth, innerHeight}} = e;
    this.updateDirection(this.getDirectionFromCoordinates(x, y, innerWidth, innerHeight));
  }

  onTick(e) {
    try {
      if( !this.paused )
        this.handleMoveHeadAction();
    } catch (ex) {
      this.gameOver(ex);
    }
  }

  getDirectionFromCoordinates(x, y, w, h) {
    const distanceX =  (x - (w / 2.0)) / w;
    const distanceY =  (y - (h / 2.0)) / h;
    if( Math.abs(distanceX) > Math.abs(distanceY) )
      return distanceX > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;
    else
      return distanceY > 0 ? DIRECTION_DOWN : DIRECTION_UP;
  }

  updateDirection(direction) {
    this.direction = direction;
    this.paused = false;
  }

  handleMoveHeadAction() {
    const newHeadPoint = this.nextHeadPosition();
    const cellValue = this.boardValue(newHeadPoint);
    if( cellValue === CELL_SNAKE ) {
      const tail = this.snake.pop();
      if( !tail.equals(newHeadPoint) )
        throw 'Eating itself';
      this.snake.unshift(tail);
    } else if( cellValue === CELL_APPLE ) {
      this.setScore(this.score + 1);
      this.apple = this.generateApple();
      this.moveSnake(newHeadPoint, false);
    } else {
      this.moveSnake(newHeadPoint, true);
    }
  }

  moveSnake(newPoint, moveTail) {
    this.addSnakeHead(newPoint);
    if( moveTail ) {
      const tail = this.snake.pop();
      this.markCell(tail, CELL_EMPTY);
    }
  }

  nextHeadPosition() {
    const {x, y} = this.snake[0];
    switch(this.direction) {
      case DIRECTION_UP:
        return this.newPoint(x, y - 1, this.pointOptions);
      case DIRECTION_RIGHT:
        return this.newPoint(x + 1, y, this.pointOptions);
      case DIRECTION_DOWN:
        return this.newPoint(x, y + 1, this.pointOptions);
      case DIRECTION_LEFT:
        return this.newPoint(x - 1, y, this.pointOptions);
      default:
        throw `Direction is invalid: ${this.direction}`;
    }
  }

  gameOver(ex) {
    const {onGameOver} = this.settings
    clearInterval(this.moveInterval);
    document.removeEventListener('keyup', this.onKeyPress);
    document.removeEventListener('click', this.onClick);
    onGameOver && (onGameOver(this.score, ex))
  }

  randomCellIndex() {
    return Math.floor(Math.random() * this.settings.columns);
  }

  addSnakeHead(point) {
    this.snake.unshift(point);
    this.markCell(point, CELL_SNAKE);
  }

  newPoint(x, y, options = {}) {
    return new Point(x, y, this.settings.columns, options);
  }

  boardValue(point) {
    return this.board[point.getIndex()];
  }

  markCell(point, value) {
    const idx = point.getIndex();
    this.board[idx] = value;
    this.gridElement.children[idx].className = this.getClassNameFromGridValue(value);
  }

  getClassNameFromGridValue(value) {
    switch(value) {
      case CELL_APPLE:
        return 'apple';
      case CELL_SNAKE:
        return 'snake';
    }
    return '';
  }

  setScore(value) {
    this.score = value;
    document.querySelectorAll('.score').forEach( e => e.innerHTML = value);
  }
} // end Snake class




function toggle(element, visible) {
  let display = 'block';
  if( typeof(visible) === 'string' )
    display = visible
  element.style.display = visible ? display : 'none';
  return element;
}

function getSplashScreen() {
  return document.getElementById('splash-screen');
}

function toggleSplashScreen(visible) {
  toggle(getSplashScreen(), visible);
  // getSplashScreen().className = visible ? '' : 'hidden';
}

function getInputValue(input) {
  return parseInt(input.value, 10);
}

function onGameOver() {
  toggleSplashScreen(true);
  toggle(document.querySelector('.game-over-panel'), true);
}

function onPlayGameClick(e) {
  e.target.blur();
  e.stopPropagation();
  toggleSplashScreen(false);

  const settings = {
    columns: getInputValue(document.getElementById('board-size')),
    interval: getInputValue(document.getElementById('game-speed')),
    version: getInputValue(document.getElementById('game-version')),
    onGameOver: onGameOver
  };
  const snake = new Snake(settings);
}


function init(e) {
  const splashScreen = getSplashScreen();
  splashScreen.className = '';
  splashScreen.querySelector('button').addEventListener('click', onPlayGameClick);
  const ddBoardSize = document.getElementById('board-size');
  for(let i = 7; i <= 20; i++) {
    const option = document.createElement('option');
    option.value = option.text = i;
    ddBoardSize.add(option);
  }
  ddBoardSize.value = 10;
}

// When DOM is ready
document.addEventListener('DOMContentLoaded', init)
