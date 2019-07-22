//
//
// LICENSE NOTICE:
// THIS FILE HAS BEEN MODIFIED AND THUS DIFFERS FROM THE ORIGINAL COLOR BREWER PROJECT
//
//

import { SpecParser, SpecCompiler, PlotTemplate, TransformNode, URLDatasetNode } from "remodel-vis";
import vegaEmbed from "vega-embed";
import * as d3 from "d3-fetch";

const colorEncodings =  ["color", "fill", "stroke"];

var schemeNames = {sequential: ["BuGn","BuPu","GnBu","OrRd","PuBu","PuBuGn","PuRd","RdPu","YlGn","YlGnBu","YlOrBr","YlOrRd"],
					singlehue:["Blues","Greens","Greys","Oranges","Purples","Reds"],
					diverging: ["BrBG","PiYG","PRGn","PuOr","RdBu","RdGy","RdYlBu","RdYlGn","Spectral"],
					qualitative: ["Accent","Dark2","Paired","Pastel1","Pastel2","Set1","Set2","Set3"] };

var selectedScheme = "BuGn",
	selectedEncoding = "color",
	selectedField = null,
	selectedView = null,
	importedTemplate = null,
	useInvertedScales = false,
	numClasses = 3;

const initialColorScheme = "GnBu";

const initialSchema = {
  "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
  "data": {
    "name": "node320744",
    "url": "https://vega.github.io/editor/data/us-10m.json",
    "format": {
      "type": "topojson",
      "feature": "counties"
    }
  },
  "mark": "geoshape",
  "encoding": {
    "color": {
      "field": "rate",
      "type": "quantitative",
			"legend": null
    }
  },
  "transform": [
    {
      "lookup": "id",
      "from": {
        "data": {
          "url": "https://vega.github.io/editor/data/unemployment.tsv"
        },
        "key": "id",
        "fields": [
          "rate"
        ]
      }
    }
  ],
  "height": 500,
  "width": 700,
  "projection": {
    "type": "albersUsa"
  }
};
const initialField = "rate";

$("#num-classes").change(function(){
	setNumClasses($(this).val());
});
$(".scheme-type").change(function(){
	setSchemeType($(this).attr("id"));
});
$("#color-system").change(updateValues);
$("#layers input").change(layerChange);
$("#filters input").change(showSchemes);
$("#customField").change(function() {
	const customField = $(this).val();
	selectField(customField);
});
$("#invertScalesBox").change(function() {
	useInvertedScales = $(this).prop("checked");
	setScheme(selectedScheme || initialColorScheme);
});

$("#importVegaButton").click(function() {
	const jsonString = $("#vegaImport").val();
  const jsonObject = JSON.parse(jsonString);
	const parser = new SpecParser();

	importedTemplate = parser.parse(jsonObject);
	selectedView = importedTemplate.getFlatHierarchy().filter(t => t instanceof PlotTemplate)[0];

	initVega();
  updateVegaSpec();
});

$("#transparency-slider").mousedown(function(){
	var max = $("#transparency-track").width();
	var handle = $(this);
	function handleMove(e){
		var l = Math.max(3,3+Math.min(e.pageX - $("#transparency-track").offset().left,max));
		handle.css("left",l);
		$("#county-map g").css("opacity",1-(l-4)/max);
	};
	function handleUp(){
		$(document).off( "mousemove",handleMove );
		$(document).off( "mouseup",handleUp );
	};
	$(document).on( "mousemove",handleMove );
	$(document).on( "mouseup",handleUp );
});

$("#road-color").spectrum({
	color: "#f33",
	showInput:true,
	change: function(color){
		if ( !$("#overlays").children().length ) return;
		$("#road-lines").css("stroke",color.toHexString());
	}
});
$("#city-color").spectrum({
	color: "#000",
	showInput:true,
	change: function(color){
		if ( !$("#overlays").children().length ) return;
		$("#cities").css("fill",color.toHexString());
	}
});
$("#border-color").spectrum({
	color: "#000",
	showInput:true,
	change: function(color){
		$("#county-map g").css("stroke",color.toHexString());
	}
});
$("#bg-color").spectrum({
	color: "#fff",
	showInput:true,
	change: function(color){
		$("#county-map rect").css("fill",color.toHexString());
	}
});

$("#terrain, #solid-color").change(function(){
	if ( $("#terrain").is(":checked") ){
		if ( !$("#terrain-img").length ) $("#map-container").prepend( $("<img id='terrain-img' src='map/terrain.jpg' />").css("left",-31).css("top",-58) );
		$("#county-map rect").css("opacity",0);
		if ( $("#transparency-slider").position().left < 4 ){
			$("#transparency-slider").css("left",$("#transparency-track").position().left + 43);
			$("#county-map g").css("opacity",.5);
		}
	} else {
		$("#county-map rect").css("opacity",1);
		if ( $("#transparency-slider").position().left == $("#transparency-track").position().left + 43 ){
			$("#transparency-slider").css("left",3);
			$("#county-map g").css("opacity",1);
		}
	}
});


function setNumClasses(n)
{
	numClasses = n;
	showSchemes();
}

var selectedSchemeType;
function setSchemeType(type)
{
	selectedSchemeType = type;

	$( "#num-classes option" ).removeAttr( "disabled" );
	switch( selectedSchemeType )
	{
		case "sequential":
			if( $( "#num-classes" ).val() >= 10 )
			{
				$( "#num-classes" ).val( 9 );
				numClasses = 9;
			}
			$( "#num-classes option[name=10], #num-classes option[name=11], #num-classes option[name=12]" ).attr( "disabled", "disabled" );
			break;
		case "diverging":
			if( $( "#num-classes" ).val() >= 12 )
			{
				$( "#num-classes" ).val( 11 );
				numClasses = 11;
			}
			$( "#num-classes option[name=12]" ).attr( "disabled", "disabled" );
			break;
	}
	showSchemes();
}

function showSchemes()
{
	$("#ramps").empty();
	for ( var i in schemeNames[selectedSchemeType]){
		if ( checkFilters(schemeNames[selectedSchemeType][i]) == false ) continue;
		var ramp = $("<div class='ramp "+schemeNames[selectedSchemeType][i]+"'></div>"),
			svg = "<svg width='15' height='75'>";
		for ( var n = 0; n < 5; n++ ){
			svg += "<rect fill="+colorbrewer[schemeNames[selectedSchemeType][i]][5][n]+" width='15' height='15' y='"+n*15+"'/>";
		}
		svg += "</svg>";
		$("#ramps").append(ramp.append(svg).click( function(){
			if ( $(this).hasClass("selected") ) return;
			setScheme( $(this).attr("class").substr(5) );
		}));
	}
	if ( selectedSchemeType == "sequential" ){
		$("#scheme1").css("width","160px");
		$("#multi").show().text("Multi-hue:");
		$("#scheme2").css("width","90px");
		$("#single").show().text("Single hue:");

		$("#singlehue").empty().css("display","inline-block");
		for ( i in schemeNames.singlehue){
			if ( checkFilters(schemeNames.singlehue[i]) == false ) continue;
			var ramp = $("<div class='ramp "+schemeNames.singlehue[i]+"'></div>"),
				svg = "<svg width='15' height='75'>";
			for ( var n = 0; n < 5; n++ ){
				svg += "<rect fill="+colorbrewer[schemeNames.singlehue[i]][5][n]+" width='15' height='15' y='"+n*15+"'/>";
			}
			svg += "</svg>";
			$("#singlehue").append(ramp.append(svg).click( function(){
				if ( $(this).hasClass("selected") ) return;
				setScheme( $(this).attr("class").substr(5) );
			}));
		}
	} else {
		$("#scheme1").css("width","100%");
		$("#multi").hide();
		$("#singlehue").empty();
		$("#single").hide();
	}

	$(".score-icon").show();
	$("#color-system").show();
	if ( $(".ramp."+selectedScheme)[0] ){
		setScheme( selectedScheme );
	} else if ( $("#ramps").children().length ) setScheme( $("#ramps .ramp:first-child").attr("class").substr(5) );
	else clearSchemes();
}

function clearSchemes()
{
	$("#counties g path").css("fill","#ccc");
	$("#color-chips").empty();
	$("#color-values").empty();
	$("#ramps").css("width","100%");
	$("#scheme-name").html("");
	$(".score-icon").hide();
	$("#color-system").hide();
	$("#ramps").append("<p>No color schemes match these criteria.</p><p>Please choose fewer data classes, a different data type, and/or fewer filtering options.</p>");
}

function updateVegaSpec()
{
	if (importedTemplate === null) {
		return;
	}

	const compiler = new SpecCompiler();
	const spec = compiler.getVegaSpecification(importedTemplate);

	vegaEmbed("#vega-container", spec);
}

function setScheme(s)
{
	$("#county-map g").removeClass(selectedScheme).addClass(s);
	$(".ramp.selected").removeClass("selected");
	selectedScheme = s;
	$(".ramp."+selectedScheme).addClass("selected");
	$("#scheme-name").html(numClasses+"-class "+selectedScheme);
	applyColors();
	drawColorChips();
	$("#permalink").val("http://colorbrewer2.org/?type="+selectedSchemeType+"&scheme="+selectedScheme+"&n="+numClasses);
	window.location.hash = "type="+selectedSchemeType+"&scheme="+selectedScheme+"&n="+numClasses;

	updateValues();

	var cssString = "";
	for ( var i = 0; i < numClasses; i ++ ){
		cssString += "."+selectedScheme+" .q"+i+"-"+numClasses+"{fill:" + colorbrewer[selectedScheme][numClasses][i] + "}";
		if ( i < numClasses - 1 ) cssString += " ";
	}
	$("#copy-css input").val(cssString);

	if (importedTemplate !== null) {
		const compiler = new SpecCompiler();
		const spec = compiler.getVegaSpecification(importedTemplate);
		$("#vegaImport").val(JSON.stringify(spec, null, 2));
	}

  if (selectedView !== null) {
		const field = selectedField;
		const type = selectedSchemeType === "sequential" ? "quantitative" : selectedSchemeType === "diverging" ? "nominal" : "ordinal";
		const schemeColors = colorbrewer[selectedScheme][numClasses];
		let range = type !== "quantitative"
			? schemeColors
			: [schemeColors[schemeColors.length - 2], schemeColors[0]];

		if (useInvertedScales) {
			range = range.reverse();
		}

		const visualVariable = selectedEncoding;
		let encoding = selectedView.encodings.get(visualVariable);

		if (!encoding) {
			encoding = {};
		}
		encoding.field = field;
		encoding.type = type;
		encoding.scale = { range };

		selectedView.encodings.set(visualVariable, encoding);
  }

	updateVegaSpec();

	$(".score-icon").attr("class","score-icon");
	var f = checkColorblind(s);
	$("#blind-icon").addClass( !f ? "bad" : (f == 1 ? "ok" : "maybe") ).attr("title",numClasses+"-class "+selectedScheme + " is " + getWord(f)+"color blind friendly");
	f = checkCopy(s);
	$("#copy-icon").addClass( !f ? "bad" : (f == 1 ? "ok" : "maybe") ).attr("title",numClasses+"-class "+selectedScheme + " is " + getWord(f)+"photocopy friendly");
	f = checkScreen(s);
	$("#screen-icon").addClass( !f ? "bad" : (f == 1 ? "ok" : "maybe") ).attr("title",numClasses+"-class "+selectedScheme + " is " + getWord(f)+"LCD friendly");
	f = checkPrint(s);
	$("#print-icon").addClass( !f ? "bad" : (f == 1 ? "ok" : "maybe") ).attr("title",numClasses+"-class "+selectedScheme + " is " + getWord(f)+"print friendly");

	function getWord(w){
		if ( !w ) return "not ";
		if ( w == 1 ) return "";
		if ( w == 2 ) return "possibly not ";
	}
}

/* function getJSON()
{
	var jsonString = "[";
	for ( var i = 0; i < numClasses; i ++ ){
		jsonString += "'" + colorbrewer[selectedScheme][numClasses][i] + "'";
		if ( i < numClasses - 1 ) jsonString += ",";
	}
	jsonString += "]";

	return jsonString;
} */

function checkFilters(scheme,f)
{
	if ( !colorbrewer[scheme][numClasses] ) return false;
	if ( $("#blindcheck").is(":checked") && checkColorblind(scheme) != 1 ) return false;
	if ( $("#printcheck").is(":checked") && checkPrint(scheme) != 1 ) return false;
	if ( $("#copycheck").is(":checked") && checkCopy(scheme) != 1) return false;
	return true;
}
function checkColorblind(scheme)
{
	return colorbrewer[scheme].properties.blind.length > 1 ? colorbrewer[scheme].properties.blind[numClasses-3] : colorbrewer[scheme].properties.blind[0];
}
function checkPrint(scheme)
{
	return colorbrewer[scheme].properties.print.length > 1 ? colorbrewer[scheme].properties.print[numClasses-3] : colorbrewer[scheme].properties.print[0];
}
function checkCopy(scheme)
{
	return colorbrewer[scheme].properties.copy.length > 1 ? colorbrewer[scheme].properties.copy[numClasses-3] : colorbrewer[scheme].properties.copy[0];
}
function checkScreen(scheme)
{
	return colorbrewer[scheme].properties.screen.length > 1 ? colorbrewer[scheme].properties.screen[numClasses-3] : colorbrewer[scheme].properties.screen[0];
}

function applyColors()
{
	if ( !colorbrewer[selectedScheme][numClasses] ){
		$("#counties g path").css("fill","#ccc");
		return;
	}
	for ( var i = 0; i < numClasses; i++ ){
		if ( !$("#borderscheck").is(":checked") ) $("#county-map g .q"+i+"-"+numClasses).css("stroke",colorbrewer[selectedScheme][numClasses][i]);
		$(".q"+i+"-"+numClasses).css("fill",colorbrewer[selectedScheme][numClasses][i]);
	}
}

function drawColorChips()
{
	var svg = "<svg width='24' height='270'>";
	for ( var i = 0; i < numClasses; i++ ){
		svg += "<rect fill="+colorbrewer[selectedScheme][numClasses][i]+" width='24' height='"+Math.min(24,parseInt(265/numClasses))+"' y='"+i*Math.min(24,parseInt(265/numClasses))+"'/>";
	}
	$("#color-chips").empty().append(svg);
	updateValues();
}

function updateValues()
{
	$("#color-values").empty();
	var str = "";
	var s = $("#color-system").val().toLowerCase();
	var jsonString = "[";
	$("#color-chips rect").each(function(i){
		var val = ( s == "cmyk" ? getCMYK(selectedScheme,numClasses,i) : getColorDisplay($(this).css("fill")) );
		str += val + "\n";

		var jsonVal = getColorDisplay($(this).css("fill"));
		if ( s == "hex" ) {
			jsonString += "'" + jsonVal + "'";
		} else {
			jsonString += "'rgb(" + jsonVal + ")'";
		}
		if ( i < numClasses - 1 ) jsonString += ",";
	});
	jsonString += "]";
	str = str.replace( /\n$/, "" );

	$("#color-values").append("<textarea readonly style='line-height:"+Math.min(24,parseInt(265/numClasses))+"px; height:"+Math.min(24,parseInt(265/numClasses))*numClasses+"px'>"+str+"</textarea>");
	$( "#ase" ).attr( "href", "export/ase/" + selectedScheme + "_" + numClasses + ".ase" );
	$( "#gpl" ).attr( "href", "export/gpl/" + selectedScheme + "_" + numClasses + ".gpl" );
	$("#copy-json input").val(jsonString);
}

function getColorDisplay(c,s)
{
	if ( c.indexOf("#") != 0 ){
		var arr = c.replace(/[a-z()\s]/g,"").split(",");
		var rgb = {r:arr[0],g:arr[1],b:arr[2]};
	}
	s = s || $("#color-system").val().toLowerCase();
	if ( s=="hex" ){
		if ( rgb ) return rgbToHex(rgb.r,rgb.g,rgb.b);
		return c;
	}
	if ( s=="rgb" || s=="cmyk" ){
		if (!rgb) rgb = hexToRgb(c);
		return rgb.r + "," + rgb.g + "," + rgb.b;
	}

}
function getCMYK( scheme, classes, n ){
	return cmyk[scheme][classes][n].toString();
}

function selectEncoding(encoding) {
	selectedEncoding = encoding;
	renderVegaUI();
}

function renderActiveEncodings() {
	if (selectedView === null) {
		return;
	}

	const encodingsContainer = $("#encodings");
	encodingsContainer.empty();

	colorEncodings.forEach(encodingName => {
		const isSelected = encodingName === selectedEncoding ? "selectedEncoding" : "";
		const isActive = selectedView.encodings.has(encodingName) ? "activeEncoding" : "";
		const newEncoding = $(`<li class="encoding ${isActive} ${isSelected}">${encodingName}</li>`);
		newEncoding.click(() => selectEncoding(encodingName));
		encodingsContainer.append(newEncoding);
	});
}

function selectView(view) {
	selectedView = view;
	renderVegaUI();
}

function renderViews() {
	if (importedTemplate === null) {
		return;
	}

	const plotViews = importedTemplate.getFlatHierarchy()
		.filter(t => t instanceof PlotTemplate);

	const viewsContainer = $("#views");
	viewsContainer.empty();

	plotViews.forEach(view => {
		const mark = typeof view.mark === "string" ? view.mark : view.mark.type;
		const isActive = view === selectedView ? "selectedView" : "";
		const newView = $(`<li class="view ${isActive}">${mark}</li>`);
		newView.click(() => selectView(view));
		viewsContainer.append(newView);
	});
}

function selectField(field) {
	selectedField = field;
	renderVegaUI();
}

function renderFields(fields) {
  const fieldsContainer = $("#fields");
	fieldsContainer.empty();

	fields.forEach(field => {
		const isSelected = field === selectedField ? "selectedField" : "";
		const newField = $(`<li class="field ${isSelected}">${field}</li>`);
		newField.click(() => selectField(field));
		fieldsContainer.append(newField);
	});
}

function getFields() {
	if (selectedView === null) {
		return;
	}

	let dataNode = null;

	if (selectedView.dataTransformationNode === null) {
		dataNode = importedTemplate.dataTransformationNode;
		if (dataNode instanceof TransformNode) {
			dataNode = dataNode.getRootDatasetNode();
		}
	} else if (selectedView.dataTransformationNode instanceof TransformNode) {
		dataNode = selectedView.dataTransformationNode.getRootDatasetNode();
	} else {
		dataNode = selectedView.dataTransformationNode;
  }

  if (dataNode instanceof URLDatasetNode) {
    let promise = null;
    if (dataNode.url.indexOf(".csv") > -1) {
      promise = d3.csv(dataNode.url);
    } else if (dataNode.url.indexOf(".json") > -1) {
      promise = d3.json(dataNode.url);
    }

    promise
      .then(data => {
        const fields = Object.keys(data[0]);
        renderFields(fields);
      });
  } else {
    // check if transform or data node
    const fields = Object.keys(dataNode.values[0]);
    renderFields(fields);
  }
}

function renderVegaUI() {
	renderActiveEncodings();
	renderViews();
	getFields();
}

function loadDefaultSchema() {
  const jsonObject = initialSchema;
  const parser = new SpecParser();

	importedTemplate = parser.parse(jsonObject);
  selectedView = importedTemplate.getFlatHierarchy().filter(t => t instanceof PlotTemplate)[0];
  selectedField = initialField;

  $("#vegaImport").val(JSON.stringify(initialSchema, null, 2));
	$("#customField").val(initialField);
	$("#ramps .ramp.selected").removeClass("selected");
}

function initVega() {
	renderVegaUI();
	updateVegaSpec();
}

function init()
{
	$("#map-container").css("background-image","none");
	var type = getParameterByName("type") || "sequential";
	var scheme = getParameterByName("scheme") || initialColorScheme;
	var n = getParameterByName("n") || 9;
	$("#"+type).prop("checked",true);
	$("#num-classes").val(n);
	setSchemeType(type);
	setNumClasses(n);
  setScheme(scheme);
  loadDefaultSchema();
	initVega();
}

init();

function layerChange()
{
	switch( $(this).attr("id") ){
		case "roadscheck":
		if ( $(this).is(":checked") ){
			if ( !$("#overlays").children().length )
				loadOverlays("roads");
			else
				$("#roads").show();
		} else {
			$("#roads").hide();
		}
		break;

		case "citiescheck":
		if ( $(this).is(":checked") ){
			if ( !$("#overlays").children().length )
				loadOverlays("cities");
			else
				$("#cities").show();
		} else {
			$("#cities").hide();
		}
		break;

		case "borderscheck":
		if ($(this).is(":checked")) $("#county-map g").children().css({"stroke":"inherit","stroke-width":"0.50"});
		else {
			var i=numClasses; while(i--){
				$("#county-map g .q"+i+"-"+numClasses).css({"stroke":colorbrewer[selectedScheme][numClasses][i],"stroke-width":"1"});
			}
		}
	}
}

function loadOverlays(o)
{
	$("#overlays").svg({
		loadURL: "map/overlays.svg",
		onLoad: function(){
			$("#overlays svg").attr("width",756).attr("height",581);
			if ( o == "cities" ) $("#roads").hide();
			else $("#cities").hide();
			$("#cities").css("fill",$("#city-color").spectrum("get").toHexString());
			$("#road-lines").css("stroke",$("#road-color").spectrum("get").toHexString());
		}
	});
}
$(".learn-more, #how, #credits, #downloads").click(function(e){
	e.stopPropagation();
	var page;
	switch( $(this).attr("id") ){
		case "number-learn-more":
		$("#learnmore-title").html("NUMBER OF DATA CLASSES");
		page = "number.html";
		break;

		case "schemes-learn-more":
		$("#learnmore-title").html("TYPES OF COLOR SCHEMES");
		page = "schemes.html";
		break;

		case "filters-learn-more":
		$("#learnmore-title").html("USABILITY ICONS");
		page = "usability.html";
		break;

		case "how":
		$("#learnmore-title").html("HOW TO USE: MAP DIAGNOSTICS");
		page = "howtouse.html";
		break;

		case "credits":
		$("#learnmore-title").html("CREDITS");
		page = "credits.html";
		break;

		case "downloads":
		$("#learnmore-title").html("DOWNLOADS");
		page = "downloads.html";
		break;

		case "context-learn-more":
		$("#learnmore-title").html("MAP CONTEXT and BACKGROUND");
		page = "context.html";
		break;
	}
	if ( page ){
		$("#learnmore #content").load("learnmore/"+page,function(){
			$("#learnmore").show().css("margin-top",($("#wrapper").height()/2-$("#learnmore").height()/2));
		});
		$("#mask").show();
	}
});
$("#learnmore #close, #mask").click(function(){
	$("#learnmore #content").empty();
	$("#learnmore, #mask").hide();
});

$( "#export #tab" ).toggle(
	function(){
		$( "#export" ).animate( { "left" : "265px" } );
	},
	function(){
		$( "#export" ).animate( { "left" : "-2px" } );
	})

function rgb2cmyk (r,g,b) {
	var computedC = 0;
	var computedM = 0;
	var computedY = 0;
	var computedK = 0;

	// BLACK
	if (r==0 && g==0 && b==0) {
	computedK = 1;
	return [0,0,0,100];
	}

	computedC = 1 - (r/255);
	computedM = 1 - (g/255);
	computedY = 1 - (b/255);

	var minCMY = Math.min(computedC,
			  Math.min(computedM,computedY));
	computedC = (computedC - minCMY) / (1 - minCMY) ;
	computedM = (computedM - minCMY) / (1 - minCMY) ;
	computedY = (computedY - minCMY) / (1 - minCMY) ;
	computedK = minCMY;

	return [Math.round(computedC*100),Math.round(computedM*100),Math.round(computedY*100),Math.round(computedK*100)];
}
function rgbToHex(r, g, b) {
    return "#" + ( (1 << 24) | (r << 16) | (g << 8) | b ).toString(16).slice(1);
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&#]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if(results == null)
    return null;
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}
