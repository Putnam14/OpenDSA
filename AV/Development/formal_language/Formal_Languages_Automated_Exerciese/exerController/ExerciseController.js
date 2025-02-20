var ExerciseController = function (jsav, fa, filePath, dataType, options, check) {
	this.init(jsav, fa, filePath, dataType, options, check);
};
var controllerProto = ExerciseController.prototype;
var logRecord = new Object();
var tryC = 0;
controllerProto.init = function (jsav, fa, filePath, dataType, options) {
	this.filePath = filePath;
	this.dataType = dataType;
	this.tests;
	this.jsav = jsav;
	this.fa = fa;
	this.currentExercise = 0;
	this.testCases;
	this.initGraph = options.initGraph;
}

controllerProto.load = function () {
	var filePath = this.filePath;
	var dataType = this.dataType;
	var tests;

	$.ajax({
		url: filePath,
		crossDomain: true,
		dataType: dataType,
		async: false,
		success: function (data) {
			tests = data;
		}
	});
	this.tests = tests;

	for (i = 0; i < this.tests.length; i++) {
		$("#exerciseLinks").append("<a href='#' id='" + i + "' class='links'>" + (i+1) + "</a>");
	}
	var proto = this;
	$('#testSolution').click(function() {
		proto.startTesting();
	});
	$('.links').click(function() {
		proto.toExercise(this);
	});
	$('#showResult').click(function () {
		alert(JSON.stringify(logRecord));
	});
	$("#testResults").hide();
	this.updateExercise(this.currentExercise);
}

controllerProto.startTesting = function() {
	tryC++;
	if (this.fa.initial == null) {
		window.alert("FA traversal requires an initial state.");
		return;
	}
	$("#testResults").empty();
	$("#testResults").append("<tr><td>Test Case</td><td>Standard Result</td><td>Your Result</td></tr>");
	var count = 0;
	var testRes = [];
	//For DFA exercises, we need to check if the machine is a DFA not an NFA.
	var exercise = this.tests[this.currentExercise];
	var type = exercise["type"];
	var numberOfTestCases = this.testCases.length;
	if(type == "describtion" || type == "both"){
		var t = $("#description").text();
		if(t.indexOf("DFA") > 0 && t.indexOf("NFA") < 0){
			numberOfTestCases++;
			var isDFA = !this.testND();
			if(isDFA){
				$("#testResults").append("<tr><td> The answer is a DFA </td><td> Yes </td><td class='correct'>" + (inputResult ? "Yes": "No") + "</td></tr>");
				count++;
				testRes.push('Test' + testNum +':' + 'Correct');
			}
			else{
				$("#testResults").append("<tr><td> The answer is a DFA </td><td> Yes </td><td class='wrong'>" + (inputResult ? "Yes": "No") + "</td></tr>");
				testRes.push('Test' + testNum +':' + 'Wrong');
			}
		}
	}
	for (i = 0; i < this.testCases.length; i++) {
		var testNum = i + 1;
		var testCase = this.testCases[i];
		var input = Object.keys(testCase)[0];
		var inputResult = willReject(this.fa, input);
		if (inputResult !== testCase[input]) {
			$("#testResults").append("<tr><td>" + input + "</td><td>" + (testCase[input] ? "Accept" : "Reject") + "</td><td class='correct'>" + (inputResult ? "Reject": "Accept") + "</td></tr>");
			count++;
			testRes.push('Test' + testNum +':' + 'Correct');
		}
		else {
			$("#testResults").append("<tr><td>" + input + "</td><td>" + (testCase[input] ? "Accept" : "Reject") + "</td><td class='wrong'>" + (inputResult ? "Reject": "Accept") + "</td></tr>");
			testRes.push('Test' + testNum + ':' + 'Wrong');
		}
	}
	var exer = {};
	exer['Attempt' + tryC.toString()] = testRes;
	exer['studentSolution'] = serialize(this.fa);
	var exNum = parseInt(this.currentExercise) + 1;
	if (count > logRecord['Exercise' + exNum +'_Highest']) {
	 	logRecord['Exercise' + exNum +'_Highest'] = count;
	}
	logRecord['Exercise' + exNum].push(exer);
	var end = new Date;
	logRecord['Exercise' + exNum + '_Time'].push(end);

	$("#percentage").text("Correct cases: " + count + " / " + numberOfTestCases);
	$("#percentage").show();
	$("#testResults").show();
	window.scrollTo(0,document.body.scrollHeight);
	$('#container').scrollTop($('#container').prop("scrollHeight"));
};

// binded with question links at the top of the page
// change the problem displayed
controllerProto.toExercise = function(button) {
	this.currentExercise = button.getAttribute('id');
	this.updateExercise(this.currentExercise);
};

// the function that really changes the problem displayed
// called by toExercise
controllerProto.updateExercise = function(id) {
	var exercise = this.tests[id];
	var type = exercise["type"];
	if (type == "expression") {
		$("#expression").html("<img src='" + latexit + exercise["expression"] + "' border='0'/>");
		$("#question").show();
		$("#description").hide();
	}
	else if(type == "both"){
		$("#description").html(exercise["description"] + 'L(<span id="expression2"></span>)');
		$("#expression2").html("<img src='" + latexit + exercise["expression"] + "' border='0'/>");
		$("#question").hide();
	}
	else {
		$("#description").text(exercise["description"]);
		$("#description").show();
		$("#question").hide();
	}
	$(".links").removeClass("currentExercise");
	$("#" + this.currentExercise).addClass("currentExercise");
	this.testCases = exercise["testCases"];
	if (!exercise["graph"]) {
		this.fa = this.initGraph({graph: {"nodes":[], "edges":[]}, layout: "automatic"});
	} else {
		this.fa = this.initGraph({graph: exercise["graph"], layout: "automatic"});
	}
	$("#testResults").hide();
	$("#percentage").hide();
	var exNum = parseInt(this.currentExercise) + 1;
	logRecord['Exercise' + exNum] = [];
	var high = 0;
	// Object.defineProperty(high, 'Highest', {value: 0, writable:true});
	logRecord['Exercise' + exNum + '_Highest'] = [];
	logRecord['Exercise' + exNum + '_Highest'].push(high);
	var start = new Date();
	logRecord['Exercise' + exNum + '_Time'] = [];
	logRecord['Exercise' + exNum + '_Time'].push(start);

};

controllerProto.testND = function() {
	var g = this.fa;
	var nd = false;
	var nodes = g.nodes();
	for(var next = nodes.next(); next; next = nodes.next()) {
		var findLambda = false;
		var findMultiple = false;
		var transition = g.transitionFunction(next, emptystring);
		if (transition.length > 0) {
			findLambda = true;
		}
		for (var key in g.alphabet) {
			// If edges have sequences of input symbols on them, only the first one matters.
			// Reason why is because this is the outgoing edge input symbol for the node.
			transition = g.transitionFunctionMultiple(next, key);
			if (transition.length > 1) {
				findMultiple = true;
				break;
			}
		}
		if (findLambda || findMultiple) {
			nd = true;
		}
	}
	return nd;
};