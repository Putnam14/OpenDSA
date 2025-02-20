// Turing Machine "class", extending FiniteAutomaton
//Galina Belolipetski
var TuringMachine = function(jsav, options) {
	Automaton.apply(this, arguments);
	this.transitions = [];
}

var square = String.fromCharCode(9633);

JSAV.ext.ds.tm = function (options) {
	var opts = $.extend(true, {visible: true, autoresize: true}, options);
	return new TuringMachine(this, opts);
};

JSAV.utils.extend(TuringMachine, JSAV._types.ds.Graph);

TuringMachine.prototype = Object.create(Automaton.prototype, {});
var tm = TuringMachine.prototype;

tm.addTransition = function(start, end, toRead, toWrite, direction) {
	var transition = new TMTransition(this.jsav, start, end, toRead, toWrite, direction, {});
	var edge = this.addEdge(start, end, {weight: transition.weight});
	transition.edge = edge;
	edge.transition = transition;
	return transition;
}

// traverse on a given input string (can do nondeterministic traversal)
tm.play = function(inputString) {
	var currentStates = [new Configuration(this.initial, inputString, this.jsav)],
			cur,
			counter = 0,
			configView = [];		// configurations to display in the message box
	for (var j = 0; j < currentStates.length; j++) {
		configView.push(currentStates[j].toString());
	}
	// this.jsav.umsg(configView.join(' | '));
	this.initial.highlight();
	this.jsav.displayInit();

	while (true) {
		if (counter === 500) {
			console.log(counter);
			break;
		}
		counter++;
		for (var j = 0; j < currentStates.length; j++) {
			currentStates[j].state.unhighlight();
			this.removeAccept(currentStates[j].state);
		}
		// get next states
		cur = this.traverse(currentStates);
		if (!cur || cur.length === 0) {
			break;
		}
		currentStates = cur;
		configView = [];
		// add highlighting and display
		for (var j = 0; j < currentStates.length; j++) {
			currentStates[j].state.highlight();
			if (this.isFinal(currentStates[j].state)) {
				this.showAccept(currentStates[j].state);
			}
			configView.push(currentStates[j].toString());
		}
		// this.jsav.umsg();
		//av.ds.tape(configView, 35, 20, "right");
		//this.jsav.umsg(configView.join(' | '));
		this.jsav.step();
	}
	for (var k = 0; k < currentStates.length; k++) {
		if (this.isFinal(currentStates[k].state)) {
			this.showAccept(currentStates[k].state);
		} else {
			this.showReject(currentStates[k].state);
		}
	}
	this.jsav.step();
	this.jsav.recorded();
};

tm.showAccept = function(state) {
	state.addClass('accepted');
}

tm.removeAccept = function(state) {
	state.removeClass('accepted');
}

tm.showReject = function(state) {
	state.addClass('rejected');
}

tm.isInitial = function(state) {
	return state == this.initial;
}

tm.isFinal = function(state) {
	return state.hasClass('final');
}

// given a list of configurations, returns the set of next configurations
tm.traverse = function(currentStates) {
	var nextStates = [];
	for (var j = 0; j < currentStates.length; j++) {
		var currentState = currentStates[j];
		var tapeValue = currentState.tape.currentValue();
		// var tapeValue = currentState.tape.value();
		var successors = currentState.state.neighbors();
		for (var next = successors.next(); next; next = successors.next()) {
			var edge = this.getEdge(currentState.state, next),
					weight = edge.weight().split('<br>');
			for (var i = 0; i < weight.length; i++) {
				weight[i] = toColonForm(weight[i]);
				var w = weight[i].split(':');
				if (tapeValue === w[0]) {
					var nextConfig = new Configuration(next, currentState.tape, this.jsav);
					if (w[1] !== square){
						nextConfig.tape.value(w[1]);
					}
					nextConfig.tape.move(w[2]);
					nextStates.push(nextConfig);
					break;
				}
				else if ((tapeValue === undefined) && w[0] === square){
					var nextConfig = new Configuration(next, currentState.tape, this.jsav);
					if (w[1] !== square){
						nextConfig.tape.value(w[1]);
					}
					nextConfig.tape.move(w[2]);
					nextStates.push(nextConfig);
					break;
				}
			}
		}
	}
	nextStates = _.uniq(nextStates, function(x) {return x.toID();});
	return nextStates;
};


//======================
// Save/Load
// save TM as XML
tm.serializeToXML = function() {
	var text = '<?xml version="1.0" encoding="UTF-8"?>';
	text = text + "<structure>";
	text = text + "<type>turing</type>";
	text = text + "<automaton>";
	var nodes = this.nodes();
	for (var next = nodes.next(); next; next = nodes.next()) {
		var left = next.position().left;
		var top = next.position().top;
		var i = next.hasClass("start");
		var f = next.hasClass("final");
		var label = next.stateLabel();
		text = text + '<state id="' + next.value().substring(1) + '" name="' + next.value() + '">';
		text = text + '<x>' + left + '</x>';
		text = text + '<y>' + top + '</y>';
		if (label) {
			text = text + '<label>' + label + '</label>';
		}
		if (i) {
			text = text + '<initial/>';
		}
		if (f) {
			text = text + '<final/>';
		}
		text = text + '</state>';
	}
	var edges = this.edges();
	for (var next = edges.next(); next; next = edges.next()) {
		var fromNode = next.start().value().substring(1);
		var toNode = next.end().value().substring(1);
		var w = next.weight().split('<br>');
		for (var i = 0; i < w.length; i++) {
			text = text + '<transition>';
			text = text + '<from>' + fromNode + '</from>';
			text = text + '<to>' + toNode + '</to>';
			w[i] = toColonForm(w[i]);
			var wSplit = w[i].split(":");
			if (wSplit[0] === emptystring) {
				text = text + '<read/>';
			} else {
				text = text + '<read>' + wSplit[0] + '</read>';
			}
			if (wSplit[1] === emptystring) {
				text = text + '<write/>';
			} else {
				text = text + '<write>' + wSplit[1] + '</write>';
			}
			text = text + '<move>' + wSplit[2] + '</move>';
			text = text + '</transition>';
		}
	}
	text = text + "</automaton></structure>"
		return text;
};

// load a TM from an XML file
tm.initFromXML = function(text) {
	var parser,
			xmlDoc;
	if (window.DOMParser) {
		parser=new DOMParser();
		xmlDoc=parser.parseFromString(text,"text/xml");
	} else {
		xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async=false;
		xmlDoc.loadXML(text);
	}
	if (xmlDoc.getElementsByTagName("type")[0].childNodes[0].nodeValue !== 'turing') {
		alert('File does not contain a Turing machine.');
	} else if (xmlDoc.getElementsByTagName("tapes")[0] && Number(xmlDoc.getElementsByTagName("tapes")[0].childNodes[0].nodeValue) !== 1) {
		alert('File contains a multitape Turing machine.');
		var loaded = $('#loadbutton');
		loaded.wrap('<form>').closest('form').get(0).reset();
		loaded.unwrap();
		return;
	} else {
		var nodes = this.nodes();
		for (var node = nodes.next(); node; node = nodes.next()) {
			this.removeNode(node);
		}
		var nodeMap = {};			// map node IDs to nodes
		var xmlStates = xmlDoc.getElementsByTagName("state");
		xmlStates = _.sortBy(xmlStates, function(x) {return x.id;})
			var xmlTrans = xmlDoc.getElementsByTagName("transition");
		for (var i = 0; i < xmlStates.length; i++) {
			var x = Number(xmlStates[i].getElementsByTagName("x")[0].childNodes[0].nodeValue);
			var y = Number(xmlStates[i].getElementsByTagName("y")[0].childNodes[0].nodeValue);
			var newNode = this.addNode({left: x, top: y});
			var isInitial = xmlStates[i].getElementsByTagName("initial")[0];
			var isFinal = xmlStates[i].getElementsByTagName("final")[0];
			var isLabel = xmlStates[i].getElementsByTagName("label")[0];
			if (isInitial) {
				this.makeInitial(newNode);
			}
			if (isFinal) {
				newNode.addClass('final');
			}
			if (isLabel) {
				newNode.stateLabel(isLabel.childNodes[0].nodeValue);
			}
			nodeMap[xmlStates[i].id] = newNode;
		}
		for (var i = 0; i < xmlTrans.length; i++) {
			var from = xmlTrans[i].getElementsByTagName("from")[0].childNodes[0].nodeValue;
			var to = xmlTrans[i].getElementsByTagName("to")[0].childNodes[0].nodeValue;
			var read = xmlTrans[i].getElementsByTagName("read")[0].childNodes[0];
			var write = xmlTrans[i].getElementsByTagName("write")[0].childNodes[0];
			var move = xmlTrans[i].getElementsByTagName("move")[0].childNodes[0].nodeValue;
			if (!read) {
				read = square;
			} else {
				read = read.nodeValue;
			}
			if (!write) {
				write = square;
			} else {
				write = write.nodeValue;
			}
			this.addEdge(nodeMap[from], nodeMap[to], {weight: read + ";" + write + "," + move});
		}
		this.layout();
	}
};


// Configuration class
var Configuration = function(state, tape, av) {
	this.state = state;
	this.tape = new Tape(tape);
	// toString returns the state value + the 'viewport' of the tape, to be displayed to the user
	this.toString = function() {
		this.tape.viewTape(this.tape.getArr(), av);
	}
	this.toID = function() {
		return this.state.value() + this.tape;
	}
};


// Transition object for Turing Machine
var TMTransition = function(jsav, start, end, toRead, toWrite, direction, options) {
	var weight = toRead + ";" + toWrite + "," + direction;
	this.weight = weight;
	this.jsav = jsav;
	this.start = start;
	this.end = end;
	this.toWrite = toWrite;
	this.toRead = toRead;
	this.direction = direction;
}

var tmTrans = TMTransition.prototype;

tmTrans.getWeight = function() {
	return this.weight;
}


/*
	 Holds the tape as an array and keeps track of current
	 position
	 linked list and keeps track of the current position
	 as well as the beginning of the string.
 */
var Tape = function(str) {
	"use strict";
	this.arr = [];
	this.current = 0;
	this.currentIndex = 0;

	if (typeof str === 'string') {
		this.arr = str.split("");
		this.current = this.arr[0];  // the current symbol
		this.currentIndex = 0;                // the current position
	}
	// else, assume that a Tape object was passed in, and create a copy of it
	else {
		this.currentIndex = str.currentIndex;
		this.arr = str.getArr();
		this.current = this.arr[this.currentIndex];
	}

	this.copy = function(value){
		var newarr = new Array(value.length);
		for (var i = 0; i < value.length; i++){
			newarr[i] = value[i];
		}
		return newarr;
	}

	this.toString = function(){
		return this.arr.toString();
	}

	this.write = function(value, location){
		this.arr[location] = value;
		size++;
		this.current = location;
	}

	this.getArr = function(){
		return this.arr;
	}

	this.currentValue = function() {
		return this.arr[this.currentIndex];
	}

	this.value = function(newValue) {
		if (typeof newValue === "undefined") {
			return undefined;
		}
		this.arr[this.currentIndex] = newValue;
		return this.arr[this.currentIndex];
	}

	this.goRight = function() {
			this.currentIndex+=1;
			this.current = this.arr[this.currentIndex];
			return this.current;
	}

	this.goLeft = function() {
			this.currentIndex-=1;
			this.current = this.arr[this.currentIndex];
			return this.current;
	}

	this.removeValue = function(location) {
		this.arr[location] = null;
		for (var i = 0; i < arr.length; i++)	{
			arr[i] = arr[i+1];
		}
	}

	// Move the tape and read the symbol
	this.move = function (str) {
		if (str === "L") {
			return this.goLeft();
		} else if (str === "R") {
			return this.goRight();
		} else if (str === "S") {
			return this.curren;
		}
	}

	this.viewTape = function (t, av) {
		var arr = av.ds.tape(t, 325, 30, "both", this.currentIndex);
		return arr;
	};
};
