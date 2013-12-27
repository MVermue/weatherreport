var cloudDivider = 3200000; //make higher for less clouds, lower for more clouds
var width;
var height;
var city;
var country;
var day = 0;
var windspeed;

//snow/rain
var snowDivider = 5000; //higher for less snow/rain, lower for more
var snow = true;
var canvas = null;
var context = null;
var bufferCanvas = null;
var bufferCanvasCtx = null;
var flakeArray = [];
var flakeTimer = null;
var maxFlakes = null;
var animateSnowTimer = null;

$(document).ready(start);

function start() {
	getLocation();
	$("#right").click(nextDay);
	$("#left").click(previousDay);
}

function getLocation()
{
	//source: http://www.w3schools.com/html/html5_geolocation.asp
	if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function(position) { showPosition(position.coords.latitude, position.coords.longitude) }, getIpPosition, { maximumAge: 600000, timeout: 10000 });
	else getIpPosition();
}

function getIpPosition() {
	$.ajax({
		url: 'http://freegeoip.net/json/',
		dataType: 'json',
		type: 'GET',
		crossDomain: true,
		success: function(data){
			showPosition(data.latitude, data.longitude);
		},
		error: function(request,error){
			$("#weatherreport").html("Geolocation has failed...");
		}
	});
}

function showPosition(latitude, longitude)
{
	$.ajax({
		url: "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude + "&sensor=true",
		dataType: "json",
		success: getCity
	});
	//https://developers.google.com/maps/documentation/geocoding/?hl=nl&csw=1#Types
}

function getCity(data) {
//Get the cityname
	for (var i = 0; i < data.results[0].address_components.length; i++) {
		for (var j = 0; j < data.results[0].address_components[i].types.length; j++) {
			if(data.results[0].address_components[i].types[j] == 'locality') {
				city = data.results[0].address_components[i].long_name;
			}
		}
	}
	
	country = data.results[data.results.length-1].address_components[0].short_name;
	
	getWeather(city, country);
}

function getWeather(city, country)
{
	$.ajax({
		url: "http://howestproxy.appspot.com/proxer?xml=api.openweathermap.org/data/2.5/weather?q=" + ( city !== undefined ? (city + ',') : '' ) + country + "&mode=xml&units=metric&APPID=66f0a547ca05b322768a854eaea943ce",
		dataType: "xml",
		success: showWeather
	});
}

function getWeatherForecast(city, country)
{
	$.ajax({
		url: "http://howestproxy.appspot.com/proxer?xml=api.openweathermap.org/data/2.5/forecast/daily?q=" + ( city !== undefined ? (city + ',') : '' ) + country + "&mode=xml&units=metric&cnt=" + (day + 1) + "APPID=66f0a547ca05b322768a854eaea943ce",
		dataType: "xml",
		success: showWeatherForecast
	});
}

function showWeatherForecast(xml) {
	today = $(xml).find("time").last();
	$("#temperature").html("<p id=min>" + parseFloat($(today).find("temperature").attr("min")).toFixed(1) + "</p> - <p id=max>" + parseFloat($(today).find("temperature").attr("max")).toFixed(1) + "</p> &deg;C");
	$("#temperature").css("font-size", 30);
	
	cloudPercentage = $(today).find("clouds").attr("all");
	windSpeed = $(today).find("windSpeed").attr("mps");
	
	$("#cloudAmount").html( cloudPercentage + "% clouds");
	$("#weatherAmount").html($(today).find("symbol").attr("name"));
	setWeatherreportPosition();
	
	weather = $(today).find("symbol").attr("var").substring(0,2);
	if (weather == "09" || weather == "10") createSnow(false);
	else if (weather == "13") createSnow(true);
	else clearSnowCanvas();
	
	createClouds(cloudPercentage, windSpeed);
	
	$("#time").html($(xml).find("time").last().attr("day"));
}

function showWeather(xml) {
	$("#temperature").html(parseFloat($(xml).find("temperature").attr("value")).toFixed(1) + " &deg;C");
	$("#temperature").css("font-size", 35);
	
	city = $(xml).find("city").attr("name");
	if (city != undefined) $("#location").html( city + ", " + $(xml).find("country").text());
	else $("#location").html($(xml).find("country").text());
	
	cloudPercentage = $(xml).find("clouds").attr("value");
	windSpeed = $(xml).find("speed").attr("value");
	$("#cloudAmount").html(cloudPercentage + "% clouds");
	$("#weatherAmount").html($(xml).find("weather").attr("value"));
	if ($(xml).find("weather").attr("icon").substring(2,3) == "d") {
		$("body").attr("id","day");
		$("#celestialBody").attr('src', 'img/sun.png');
	}
	else 
	{
		$("body").attr("id", "night");
		drawStars();
		$("#celestialBody").attr('src', 'img/moon.png');
		$("#ground").css('background-image', 'url(img/ground_green_night.png)');
	}
	
	$("#loadingscreen").remove();
	weather = $(xml).find("weather").attr("icon").substring(0,2);
	//weather condition codes (and icons if wanted): http://bugs.openweathermap.org/projects/api/wiki/Weather_Condition_Codes
	if (weather == "09" || weather == "10") createSnow(false);
	else if (weather == "13") createSnow(true);
	else clearSnowCanvas();
	createClouds(cloudPercentage, windSpeed);
	setWeatherreportPosition();
	d = new Date();
	year = d.getFullYear();
	month = d.getMonth()+1;
	dayOfMonth = d.getDate();
	$("#time").html(year + '-' + (month<10 ? '0' : '') + month + '-' + (dayOfMonth<10 ? '0' : '') + dayOfMonth);
	$( window ).resize(function() {
		setWeatherreportPosition();
		if ($(xml).find("weather").attr("icon").substring(2,3) == "n") drawStars();
		createClouds(cloudPercentage, windSpeed);
		if (weather == "09" || weather == "10") createSnow(false);
		else if (weather == "13") createSnow(true);
		else clearSnowCanvas();
	});
}

function setWeatherreportPosition() {
	$("#weatherreport").css("left", ($(window).innerWidth() - $('#weather').outerWidth())/2);
	$("#weatherreport").css("top", ($(window).innerHeight() - $('#weather').outerHeight())/2);
}

function createClouds(cloudPercentage,windSpeed) {
	$("#clouds").html("");
	width = window.innerWidth;
	height = window.innerHeight;
	amountOfClouds = width * (height / 2) * cloudPercentage / cloudDivider;
	for(var i=0; i < amountOfClouds; i++)
	{
		$("#clouds").append("<div class=cloud></div>");
	}
	windspeed = windSpeed;
	$(".cloud").each(styleClouds);
}

function styleClouds() {
	speed = 0.4 + 0.05 * Math.random() * windspeed;
	$(this).css("transform", "scale(" + speed + ")");
	$(this).css("animation", "moveclouds " + (40 + Math.random() * 25) + "s linear infinite");
	$(this).css("opacity", 0.6 + 0.4 * Math.random());
	$(this).css("left", + Math.round(Math.random() * width) + "px");
	$(this).css("top", Math.random() * height + "px");
}

function drawStars() {
	canvas = document.getElementById("stars");
	ctx = canvas.getContext("2d");
	
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
		
	for (i=0; i <= 100; i++) {
		var x = Math.floor(Math.random() * canvas.width);
		var y = Math.floor(Math.random() * canvas.height);
		
		ctx.fillStyle = "white";
		
		ctx.beginPath();
		ctx.arc(x, y, Math.random() * 2, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
	}
}

function createSnow(isSnow) {
	maxFlakes = window.innerWidth * window.innerHeight / snowDivider;
	snow = isSnow;
	//Canvas on Page
	canvas = document.getElementById('rain');
	context = canvas.getContext("2d");
	context.canvas.width = window.innerWidth;
	context.canvas.height = window.innerHeight;
	//Buffer Canvas
	bufferCanvas = document.createElement("canvas");
	bufferCanvasCtx = bufferCanvas.getContext("2d");
	bufferCanvasCtx.canvas.width = window.innerWidth;
	bufferCanvasCtx.canvas.height = window.innerWidth;
	
	flakeArray.length = 0;
	clearInterval(flakeTimer);
	flakeTimer = setInterval(addFlake, 100);
	
	DrawSnow();
	
	clearInterval(animateSnowTimer);
	animateSnowTimer = setInterval(animateSnow, 30);
}
function addFlake() {

	if (flakeArray.length < maxFlakes) flakeArray[flakeArray.length] = new snowFlake();
	else clearInterval(flakeTimer);
}
function clearCanvas() {
	bufferCanvasCtx.canvas.width = bufferCanvasCtx.canvas.width;
	bufferCanvasCtx.canvas.height = bufferCanvasCtx.canvas.height;
	
	context.canvas.width = context.canvas.width;
	context.canvas.height = context.canvas.height;
}

function Update() {
	for (var i = 0; i < flakeArray.length; i++) {
		if (flakeArray[i].y < context.canvas.height) {
			flakeArray[i].y += flakeArray[i].speed;
			if (flakeArray[i].y > context.canvas.height)
				flakeArray[i].y = -5;
			flakeArray[i].x += flakeArray[i].drift;
			if (flakeArray[i].x > context.canvas.width)
				flakeArray[i].x = 0;
		}
	}

}

function animateSnow() {
	Update();
	DrawSnow();
}

function snowFlake() {
	this.x = Math.round(Math.random() * context.canvas.width);
	this.y = -10;
	this.drift = Math.random();
	if (snow) {
		this.speed = Math.round(Math.random() * 5) + 1;
		this.width = (Math.random() * 3) + 2;
		this.height = this.width;
	} else {
		this.speed = Math.round(Math.random() * 5) + 18;
		this.width = 1;
		this.height = (Math.random() * 3) + 10;
	}
}
function DrawSnow() {
	context.save();

	clearCanvas();
	
	color = null;
	if (snow) color = "white";
	else color = "rgba(255,255,255,0.8)";
	
	for (var i = 0; i < flakeArray.length; i++) {
		bufferCanvasCtx.fillStyle = color;
		bufferCanvasCtx.fillRect(flakeArray[i].x, flakeArray[i].y, flakeArray[i].width, flakeArray[i].height);
	}


	context.drawImage(bufferCanvas, 0, 0, bufferCanvasCtx.canvas.width, bufferCanvasCtx.canvas.height);
	context.restore();
}

function nextDay() {
	day++;
	if (day == 16) $("#right").hide();
	else $("#left").show();
	getWeatherForecast(city,country);
}

function previousDay() {
	day--;
	if (day == 0) {
		$("#left").hide();
		getWeather(city,country);
	}
	else {
		$("#right").show();
		getWeatherForecast(city,country);
	}
}

function clearSnowCanvas() {
	clearInterval(flakeTimer);
	clearInterval(animateSnowTimer);
	canvas = document.getElementById('rain');
	context = canvas.getContext("2d");
	context.canvas.width = window.innerWidth;
	context.canvas.height = window.innerHeight;
}