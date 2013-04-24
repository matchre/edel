var edel = function(){
	//Does everything related to the grid
	function Grid(data){
		//some counters
		this.nCellsOn = 0;
		this.nCellsGuessed = 0;
		this.nCellsError = 0;
		
		//The two first numbers of the data give the size
		this.size = parseInt(data.slice(0, 2));
		this.data = [];
		
		var content = data.slice(2);
		var index = 0;
		
		//load the data
		for(var y = 0; y < this.size; y++){
			this.data[y] = [];
			for(var x = 0; x < this.size; x++){
				var datum = content[index];
				index ++;

				this.data[y][x] = {
					on: datum == '1',
					guessed: false,
					error: false
				};
				
				if(datum == '1'){
					this.nCellsOn ++;
				}
			}
		}
		
		//Compute the columns and lines indicators
		this.buildIndicators();
	}
	
	Grid.prototype = {
		buildIndicators: function(){
			//return the indicator for a given line/column
			function getBlocks(a){
				var blocks = [];
				var inBlock = false;
				var blockSize = 0;
				
				for(var i = 0; i < a.length; i++){
					if(a[i].on){
						//Continuing block
						if(inBlock){
							blockSize ++;
						}else{
							//new block
							blockSize = 1;
							inBlock = true;
						}
					}else{
						//end of a block
						if(inBlock){
							blocks.push(blockSize);
							inBlock = false;
						}
					}
				}
				
				//Do not forget the last block
				if(inBlock){
					blocks.push(blockSize);
				}
				
				return blocks;
			}

			this.lines = [];
			this.cols = [];

			//Lines are easy to get
			for(var x = 0; x < this.size; x++){
				this.lines[x] = getBlocks(this.data[x]);
			}
			
			//Use map (need aight.js for IE8) to get the columns
			for(var y = 0; y < this.size; y++){
				this.cols[y] = getBlocks(this.data.map(function(col){return col[y];}));
			}
		},
		
/*		on: function(x, y){
			return this.data[y][x].on;
		},*/
		
		internalClick: function(elem, clickType){
			$elem = $(elem);
			var x = $elem.data("x");
			var y = $elem.data("y");
			var datum = this.data[y][x];

			if(datum.guessed){
				return;
			}
			
			this.onClick(this, x, y, clickType);
			
			//Update the cell content (avoids a complete redraw)
			if(datum.guessed){
				$elem.removeClass("edel-cell-unknown");
				if(datum.error){
					$elem.addClass("edel-cell-error");
				}else{
					$elem.addClass("edel-cell-correct");
				}
				if(!datum.on){
					$elem.html('<img src="croix15.png"/>');
				}
			}
		},
		
		useElement: function($elem){
			this.$domElement = $elem;
			this.render();
			
			//Do not allow the user to select things in the grid (starts a d'n'd which is not good)
			this.$domElement.attr("unselectable", "on")
                 .css("user-select", "none")
				 .css("cursor", "default")
                 .on("selectstart", false);
			
			//Tells the grid to use this element for events
			var self = this;
			this.$domElement.on("mousedown", "td.edel-cell", function(e){
				if(e.which == 1){
					self.internalClick(this, true);
				}
				if(e.which == 3){
					self.internalClick(this, false);
				}
			}).on("mousemove", "td.edel-cell", function(e){
				if(trackedClickWhich == 1){
					self.internalClick(this, true);
				}
				if(trackedClickWhich == 3){
					self.internalClick(this, false);
				}
			}).on("contextmenu", function(e) {
				//Do not show a contextmenu on right-click
                e.preventDefault();
            });
		},
		
		removeFromDOM: function($elem){
			//Removes registered events not to have several grids at the same time
			$elem.off("mousedown").off("contextmenu").off("mousemove").html("");
		},
		
		registerClick: function(handler){
			this.onClick = handler;
		},
		
		render: function($elem){
			//Just calls the JSRender template
			this.$domElement.html($("#edel-grid-template").render({
				lines: this.lines,
				cols: this.cols,
				mdata: this.data
			}));
		},
		
		guess: function(x, y, guess){
			//Called when the player guess a case's state
			var datum = this.data[y][x];
			
			//Do not guess a case twice
			if(datum.guessed){
				return;
			}
			datum.guessed = true;
			
			//Only count full cases
			if(guess){
				this.nCellsGuessed ++;
			}
			
			//Count errors
			if(guess != datum.on){
				datum.error = true;
				this.nCellsError ++;
			}
		},
		
		hint: function(){
			//Unveils a single random non-guessed cell
			var nCellsRemaining = this.nCellsOn - this.nCellsGuessed;
			var cellToHint = Math.floor(Math.random() * nCellsRemaining);

			//Do not pick random cells because when only one cell is available it would be too slow
			//Instead choose an index in the set of non-guessed cells and unveil the corresponding cell
			var seen = 0;
			for(var x = 0; x < this.size; x++){
				for(var y = 0; y < this.size; y++){
					if(this.data[y][x].on && !this.data[y][x].guessed){
						if(seen == cellToHint){
							//Call the external logic
							this.onClick(this, x, y, true);
							this.render();
							return;
						}
						seen ++;
					}
				}
			}
		},
		
		reset: function(){
			//Puts back everything like it is after new Grid()
			this.nCellsGuessed = 0;
			this.nCellsError = 0;
			for(var y = 0; y < this.size; y++){
				for(var x = 0; x < this.size; x++){
					this.data[y][x].guessed = false;
					this.data[y][x].error = false;					
				}
			}
			this.render();
		},
		
		unveil: function(){
			//Unveils every case
			for(var y = 0; y < this.size; y++){
				for(var x = 0; x < this.size; x++){
					if(!this.data[y][x].guessed){
						this.data[y][x].guessed = true;
						this.data[y][x].error = true;
					}
				}
			}
			this.render();
		}
	}

	var trackedClickWhich = 0;
	$(document).mousedown(function(e){
        trackedClickWhich = e.which;
    });
    $(document).mouseup(function(e){
        trackedClickWhich = 0;
    });
	
	//Jquery objects
	var $grid,
		$inGame,
		$gameControls,
		$winGame,
		$loseGame,
		$progressBar,
		$errorBar,
		$newGame,
		$newGameForm,
		$hintButton,
		
		//some global state
		currentGrid = null,
		canHint = true,
		playing = false,
		canCheat = false; //DO NOT FORGET TO PUT TO FALSE
	
	function loadGrid(number, difficulty, onSuccess){
		//Loads the corresponding grid and calls onSuccess when finished with the Grid object
		var baseURL = "grids/";
		var difficultyNames = ["easy", "medium", "hard"];
		
		$.ajax(baseURL + difficultyNames[difficulty] + "/grille_numero_" + number + ".edel", {
			dataType: "text",
			success: function(data){onSuccess(new Grid(data));}
		});
	}

	function handleClick(grid, x, y, leftClick){
		if(!playing){
			return;
		}
		//Update the grid
		grid.guess(x, y, leftClick);
		//grid.renderTo($grid);
		
		//Win condition
		if(grid.nCellsGuessed == grid.nCellsOn){
			$gameControls.hide();
			$winGame.show();
			playing = false;
			return;
		}
		
		//Lose condition
		if(grid.nCellsError > grid.nCellsOn / 6){
			$gameControls.hide();
			$loseGame.show();
			playing = false;
			return;
		}
		
		updateBars(grid);
	};
		
	function updateBars(grid){
		//Simply set the size of the corresponding divs
		$progressBar.width(Math.floor(grid.nCellsGuessed * 200 / grid.nCellsOn));
		$errorBar.width(Math.floor(grid.nCellsError * 200 / grid.nCellsOn * 6));
	}
		
	return {
		init: function(){
			//The document is loaded: get JQuery objects
			$grid = $("#edel-grid");
			$inGame = $("#edel-ingame");
			$gameControls = $("#edel-controls");
			$winGame = $("#edel-wingame");
			$loseGame = $("#edel-losegame");
			$progressBar = $("#edel-progress-bar");
			$errorBar = $("#edel-error-bar");
			$newGame = $("#edel-newgame");
			$newGameForm = $("#edel-size");
			$hintButton = $("#edel-hint-button");
			
			//Do not show the game screen at the start
			$inGame.hide();
		},
		
		newGame: function(){
			//Show the right elements but not the ingame elements yet
			$newGame.hide();
			$gameControls.show();
			$winGame.hide();
			$loseGame.hide();
			playing = true;
			
			//load the grid
			var difficulty = $("#edel input[name=size]:checked").val();
			loadGrid(Math.floor(Math.random() * 101), difficulty, function(grid){
				//Setup the grid
				if(currentGrid !== null){
					currentGrid.removeFromDOM($grid);
				}
				grid.useElement($grid);
				//grid.renderTo($grid);
				grid.registerClick(handleClick);
				currentGrid = grid;
				
				//Update the UI
				canHint = true;
				$hintButton.attr("disabled", false);
				$inGame.show();
				updateBars(grid);
			});
		},
		
		goToLobby: function(){
			$newGame.show();
			$inGame.hide();
			playing = false;
		},
		
		hintPlease: function(){
			//Yes we can!
			if(canCheat){
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
				currentGrid.hint();
			}else{
				if(canHint){
					//We can only get one hint per game
					canHint = false;
					currentGrid.hint();
					$hintButton.attr("disabled", true);
				}
			}
		},
		
		retry: function(){
			//Just resets the grid and shows the right UI
			$gameControls.show();
			$loseGame.hide();
			playing = true;
			canHint = true;
			$hintButton.attr("disabled", false);
			currentGrid.reset();
			//currentGrid.renderTo($grid);
			updateBars(currentGrid);
		},
		
		showSolution: function(){
			//Updates the grid
			currentGrid.unveil();
			//currentGrid.renderTo($grid);
		}
	};
}()

$(document).ready(function(){
	edel.init();
})