(function () {
	// Contains all the pixel art for the game
	const SPRITE = new Image();

	SPRITE.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAgBAMAAAA4QOGPAAAAJFBMVEUnLTPj5+kXHCGPNUU8REx7yMLmt37yi4LloKCRx6O5oOWKtO2oFlq6AAAA60lEQVQ4y9XTvQ2DMBCG4YOG1icyARtYXoBIWSErpE7nFbKCV8gKLJez7yxwSA4ENLzNV6BHMn9wroYhTQghrfceuDfEXlTcOxUXqZ0QImQr69kJBI5U7igYgjBx41EZUtkdA5kxTZACLklSR0OqfB3zo4rbDE/ejevzguSkJVjnnUDbMqzMT8jT5VVgR8V9UAVsnlNoHaJrHVSACEaDjS8gOZJu8j92cplUAf0XvFwZ0uqwKaGNIB41rll/jxZTbcVrNAhmAY6XFehI8lHZaRBRearKUZHaC+cfwOZPbl7fcbLrYS0g77/f6gN/OIYlP384IAAAAABJRU5ErkJggg==";

	const TILE = 16;

	// Each sprite is 16x16
	function _sprite(pCtx, pIcon, pX, pY, pSize) {
		let x,
			y,
			outline = false;

		if ("123456789".includes(pIcon)) {
			const n = parseInt(pIcon);

			// First row
			if (n <= 7) {
				x = (n - 1) * TILE;
				y = 0;
			} else {
				x = (n - 8) * TILE;
				y = TILE;
			}

			outline = true;
		} else {
			// All in the second row
			y = TILE;

			switch (pIcon) {
				case "closed":
					x = 2 * TILE;

					break;
				case "flag":
					x = 3 * TILE;

					break;
				case "empty":
					x = 4 * TILE;
					outline = true;

					break;
				case "mine_red":
					x = 5 * TILE;
					outline = true;

					break;
				case "mine":
					x = 6 * TILE;
					outline = true;

					break;
				default:
					return false;
			}
		}

		pCtx.drawImage(SPRITE, x, y, TILE, TILE, pX, pY, pSize, pSize);

		if (outline) {
			pCtx.lineWidth = Math.floor(pSize / TILE);
			pCtx.strokeStyle = "#171c21";

			pCtx.strokeRect(pX - 1, pY - 1, pSize + 2, pSize + 2);
		}

		return true;
	}

	class Cell {
		constructor(pX, pY) {
			this.x = pX;
			this.y = pY;

			// Was the cell clicked or force opened
			this.clicked = false;

			this.mine = false;
			this.flag = false;
			this.open = false;
		}

		_draw(pGame, pCtx, pSize) {
			const x = this.x * pSize,
				y = this.y * pSize;

			if (this.open) {
				if (this.mine) {
					_sprite(pCtx, this.clicked ? "mine_red" : "mine", x, y, pSize);
				} else {
					const mines = pGame._getNeighborCounts(this.x, this.y).mines;

					_sprite(pCtx, mines || "empty", x, y, pSize);
				}
			} else if (this.flag) {
				_sprite(pCtx, "flag", x, y, pSize);
			} else {
				_sprite(pCtx, "closed", x, y, pSize);
			}
		}

		_open(pGame, pClicked = false, pRecursive = false) {
			if (this.flag) {
				return;
			}

			const { flags, mines } = pGame._getNeighborCounts(this.x, this.y);

			// Helper to open all cells around a cell (if flag count matches mine count)
			if (this.open) {
				if (!pRecursive && !this.mine && flags === mines) {
					pGame._getNeighbors(this.x, this.y).forEach((pCell) => {
						if (pCell.open || pCell.flag) {
							return;
						}

						pCell._click(pGame, true);
					});
				}

				return;
			}

			this.open = true;
			this.clicked = pClicked;

			if (this.mine) {
				pGame._gameOver();
			} else {
				if (mines !== 0) {
					return;
				}

				pGame._getNeighbors(this.x, this.y).forEach((pCell) => {
					if (pCell.mine || pCell.open || pCell.flag) {
						return;
					}

					pCell._click(pGame);
				});
			}
		}

		_click(pGame, pRecursive = false) {
			this._open(pGame, true, pRecursive);
		}
	}

	class Minesweeper {
		constructor(pTarget, pMines, pCols, pRows) {
			this.target = document.querySelector(pTarget);
			this.ctx = this.target.getContext("2d");

			// pixel art pog
			this.target.style.imageRendering = "pixelated";

			this.mines = pMines;
			this.rows = pRows;
			this.cols = pCols;

			this.grid = [];

			this.hoveredX = false;
			this.hoveredY = false;

			this.gameWon = false;
			this.gameOver = false;

			this.started = false;

			this.restart();

			new FontFace("Kode Mono", "url(https://fonts.gstatic.com/s/kodemono/v1/A2BLn5pb0QgtVEPFnlYkkaoBgw4qv9odq6uyxDOZadW2.woff2)") // 400
				.load()
				.then((pFont) => document.fonts.add(pFont));

			new FontFace("Kode Mono", "url(https://fonts.gstatic.com/s/kodemono/v1/A2BLn5pb0QgtVEPFnlYkkaoBgw4qv9odq6uyxD2ZaQ.woff2)") // 500
				.load()
				.then((pFont) => document.fonts.add(pFont));
		}

		setHighScores(pHighScores) {
			this.highScores = pHighScores.sort((pA, pB) => pA.score - pB.score).slice(0, 5);

			this._draw();
		}

		getScore() {
			if (!this.started) {
				return false;
			}

			const time = Math.floor((Date.now() - this.started) / 1000);

			if (time >= 6000) {
				return false;
			}

			return time;
		}

		on(pEvent, pCallback) {
			this.target.addEventListener(pEvent, pCallback);
		}

		restart() {
			this._init();
		}

		_trigger(pEvent) {
			const event = new Event(pEvent);

			this.target.dispatchEvent(event);
		}

		_init() {
			this.grid = [];

			this.started = false;

			this.gameWon = false;
			this.gameOver = false;

			this.hoveredX = false;
			this.hoveredY = false;

			// Reset height/width
			this.target.removeAttribute("width");
			this.target.removeAttribute("height");

			// Set up grid
			for (let x = 0; x < this.cols; x++) {
				this.grid[x] = [];

				for (let y = 0; y < this.rows; y++) {
					this.grid[x][y] = new Cell(x, y);
				}
			}

			// Distribute mines
			let mines = this.mines;

			while (mines > 0) {
				const x = Math.floor(Math.random() * this.cols),
					y = Math.floor(Math.random() * this.rows),
					cell = this.grid[x][y];

				if (cell.mine) {
					continue;
				}

				cell.mine = true;

				mines--;
			}

			// Set up events
			this._initEvents();

			// Initial opened cell
			const cells = this._filter((pCell) => !pCell.mine && !this._getNeighborCounts(pCell.x, pCell.y).mines),
				cell = cells[Math.floor(Math.random() * cells.length)];

			cell._click(this);

			this._draw();

			clearInterval(this.interval);

			this.interval = setInterval(() => {
				this._draw();
			}, 250);
		}

		_initEvents() {
			if (this._events) {
				return;
			}

			this._events = true;

			// Left Click
			this.on("click", (e) => {
				if (this.gameOver || this.gameWon) {
					this.restart();

					return;
				}

				const pos = this._pos(e),
					cell = this._get(pos[0], pos[1]);

				if (!cell) {
					return;
				}

				if (!this.started) {
					this.started = Date.now();

					this._trigger("gameStarted");
				}

				cell._click(this);

				this._draw();
			});

			// Right click
			this.on("contextmenu", (e) => {
				e.preventDefault();

				if (this.gameOver || this.gameWon) {
					return;
				}

				const pos = this._pos(e),
					cell = this._get(pos[0], pos[1]);

				if (!cell || cell.open) {
					return;
				}

				if (!this.started) {
					this.started = Date.now();
				}

				cell.flag = !cell.flag;

				this._checkWin();

				this._draw();
			});

			// Mouse over
			this.on("mousemove", (e) => {
				if (this.gameOver || this.gameWon) {
					return;
				}

				const pos = this._pos(e);

				this.hoveredX = pos[0];
				this.hoveredY = pos[1];

				this._draw();
			});

			// Mouse out
			this.on("mouseout", (e) => {
				if (this.gameOver || this.gameWon) {
					return;
				}

				this.hoveredX = false;
				this.hoveredY = false;

				this._draw();
			});
		}

		_gameOver() {
			if (this.gameOver) {
				return;
			}

			this.gameOver = true;

			this.hoveredX = false;
			this.hoveredY = false;

			this._iterate((pCell) => {
				if (pCell.mine) {
					pCell.open = true;
				}
			});

			this._draw();

			this._trigger("gameOver");
		}

		_checkWin() {
			if (this.gameOver || this.gameWon) {
				return;
			}

			this.gameWon = !this._find((pCell) => pCell.mine && !pCell.flag);

			if (this.gameWon) {
				this.hoveredX = false;
				this.hoveredY = false;

				this._iterate((pCell) => {
					if (!pCell.open && !pCell.flag) {
						pCell.open = true;
					}
				});

				this._trigger("gameWon");
			}
		}

		_formatScore(pScore) {
			const minutes = Math.floor(pScore / 60),
				seconds = pScore % 60;

			return Math.min(minutes, 99).toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
		}

		_drawScore() {
			const score = this.getScore();

			if (score === false) {
				return;
			}

			const text = this._textSize("text"),
				padding = text / 2;

			this.ctx.shadowColor = "#000000";
			this.ctx.shadowBlur = text / 2;

			this.ctx.fillStyle = "#ffffff";
			this.ctx.font = `400 ${text}px "Kode Mono"`;
			this.ctx.textAlign = "right";
			this.ctx.textBaseline = "top";

			this.ctx.fillText(this._formatScore(score), this.target.width - padding, padding);
		}

		_scale() {
			const size = this.target.getBoundingClientRect(),
				width = Math.floor(size.width / this.cols),
				height = Math.floor(size.height / this.rows),
				min = Math.min(width, height);

			// Update canvas size to match
			this.target.width = min * this.cols;
			this.target.height = min * this.rows;

			return min / TILE;
		}

		_textSize(pType) {
			const height = this.target.height;

			switch (pType) {
				case "title":
					return Math.floor(height / 14);
				case "subtitle":
					return Math.floor(height / 24);
				case "text":
					return Math.floor(height / 32);
			}

			return 0;
		}

		_draw() {
			const scale = this._scale(),
				width = this.target.width,
				height = this.target.height;

			this.ctx.imageSmoothingEnabled = false;

			this.ctx.clearRect(0, 0, width, height);

			// If game is over or won, slightly blur the background
			if (this.gameOver || this.gameWon) {
				this.ctx.filter = "blur(3px)";
			}

			// Draw cells
			this._iterate((pCell) => {
				pCell._draw(this, this.ctx, TILE * scale);
			});

			if (this.gameOver || this.gameWon) {
				clearInterval(this.interval);

				// Remove blur
				this.ctx.filter = "none";

				// Text sizes and positions
				const title = this._textSize("title"),
					subtitle = this._textSize("subtitle"),
					text = this._textSize("text");

				let x = scale * 4,
					y = scale * 4;

				// Darken background
				this.ctx.fillStyle = "rgba(10, 14, 17, 0.65)";
				this.ctx.fillRect(0, 0, width, height);

				// Text shadow
				this.ctx.shadowColor = "#000000";
				this.ctx.shadowBlur = title / 2;

				// Title
				this.ctx.fillStyle = "#ffffff";
				this.ctx.font = `500 ${title}px "Kode Mono"`;
				this.ctx.textAlign = "left";
				this.ctx.textBaseline = "top";

				this.ctx.fillText(this.gameWon ? "You Won" : "Game Over", x, y);

				y += title * 1.2;

				// Update shadow size
				this.ctx.shadowBlur = subtitle / 2;

				// Subtitle
				this.ctx.font = `400 ${subtitle}px "Kode Mono"`;

				this.ctx.fillText("Click to start a new game", x, y);

				y += subtitle * 3;

				// High-scores
				if (this.highScores) {
					this.ctx.font = `500 ${subtitle}px "Kode Mono"`;

					this.ctx.fillText("Best times", x, y);

					y += subtitle * 1.5;

					this.highScores.forEach((pScore) => {
						const name = pScore.name.substring(0, 20),
							score = this._formatScore(pScore.score);

						this.ctx.font = `400 ${text}px "Kode Mono"`;

						this.ctx.fillText(`${score} - ${name}`, x, y);

						y += text * 1.5;
					});
				}
			} else {
				// Draw hovered cell
				if (this.hoveredX !== false && this.hoveredY !== false) {
					const sX = this.hoveredX * TILE * scale,
						sY = this.hoveredY * TILE * scale;

					this.ctx.fillStyle = "rgba(200, 223, 212, 0.1)";

					this.ctx.fillRect(sX, sY, TILE * scale, TILE * scale);
				}
			}

			this._drawScore();
		}

		_pos(pEvent) {
			const rect = this.target.getBoundingClientRect(),
				x = Math.floor(((pEvent.clientX - rect.left) / rect.width) * this.cols),
				y = Math.floor(((pEvent.clientY - rect.top) / rect.height) * this.rows);

			return [x, y];
		}

		_get(pX, pY) {
			if (pX < 0 || pX >= this.cols || pY < 0 || pY >= this.rows) {
				return null;
			}

			return this.grid[pX][pY];
		}

		_getNeighbors(pX, pY) {
			const offsets = [
				[-1, -1],
				[0, -1],
				[1, -1],
				[-1, 0],
				[1, 0],
				[-1, 1],
				[0, 1],
				[1, 1],
			];

			return offsets
				.map((pOffset) => {
					return this._get(pX + pOffset[0], pY + pOffset[1]);
				})
				.filter((pCell) => pCell);
		}

		_getNeighborCounts(pX, pY) {
			const neighbors = this._getNeighbors(pX, pY);

			const flags = neighbors.filter((pCell) => pCell.flag).length,
				mines = neighbors.filter((pCell) => pCell.mine).length;

			return {
				flags: flags,
				mines: mines
			};
		}

		_iterate(pCallback) {
			for (let x = 0; x < this.cols; x++) {
				for (let y = 0; y < this.rows; y++) {
					const cell = this.grid[x][y];

					if (pCallback(cell) === false) {
						return;
					}
				}
			}
		}

		_find(pCallback) {
			let cell = null;

			this._iterate((pCell) => {
				if (pCallback(pCell)) {
					cell = pCell;

					return false;
				}
			});

			return cell;
		}

		_filter(pCallback) {
			const cells = [];

			this._iterate((pCell) => {
				if (pCallback(pCell)) {
					cells.push(pCell);
				}
			});

			return cells;
		}
	}

	window.Minesweeper = Minesweeper;
})();

const m = new Minesweeper("#game", 99, 30, 18);

m.setHighScores([
	{ name: "Test", score: 123 },
	{ name: "Test", score: 234 },
	{ name: "Test", score: 345 },
	{ name: "Test", score: 456 },
	{ name: "Test", score: 5999 },
]);
