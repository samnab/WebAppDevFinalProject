$(document).ready(function () {
	var OWMApiKey = "1eb3724098349c776aa10b48e8ec1d53";
	var calendar = $("#calendar");

	if (navigator.geolocation) {
		console.log("geolocation is supported!")
		setTimeout(getWeatherData, 1000);
	} else {
		console.log("geoloaction is not supported");
	}

	function getWeatherData() {
		navigator.geolocation.getCurrentPosition(function (position) {
			console.log("lat: " + position.coords.latitude + " lon: " + position.coords.longitude);
			$.ajax({
				url: "http://api.openweathermap.org/data/2.5/weather?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude + "&units=metric&APPID=" + OWMApiKey,
				type: "GET",
				dataType: "json",
				success: function (data) {
					var temp = Math.round(data.main.temp);

					$(".weather-locale").html(
						"" + data.name
					);
					$(".weather-temp").html(
						"" + temp + "<span>&deg;C</span>"
					);
					var weathericon = $(".weather-icon").children('i');
					weathericon.removeClass('wi wi-day-snow-wind');
					weathericon.addClass('wi wi-owm-' + data.weather[0].id);
				},
				error: function () {
					console.log("error has occured with downloadWeather");
				}
			});
		});
	}

	calendar.fullCalendar({
		header: {
			left: 'title',
			center: '',
			right: 'today, prev,next'
		},
		theme: false,
		defaultView: 'list',
		defaultDate: '2017-01-06',
		disableDragging: true,
		navLinks: true, // can click day/week names to navigate views
		dayClick: function (date, jsEvent, view) {
			calendar.fullCalendar('gotoDate', date);
			calendar.fullCalendar('changeView', 'agendaDay');

			$('.btn-selector').closest('.row').find('.btn-selector').removeClass('selected');
			$('div[data-type*=day').addClass('selected');
		},
		editable: false,
		eventLimit: true, // allow "more" link when too many events
		events: ["courses.json"]
	});

	$('.btn-selector').click(function () {
		$(this).closest('.row').find('.btn-selector').removeClass('selected');
		var type = $(this).attr('data-type');
		switch (type) {
		case 'day':
			calendar.fullCalendar('changeView', 'agendaDay');
			break;
		case 'week':
			calendar.fullCalendar('changeView', 'agendaWeek');
			break;
		case 'month':
			calendar.fullCalendar('changeView', 'month');
			break;
		case 'list':
			calendar.fullCalendar('changeView', 'listWeek');
			break;
		}
		$(this).addClass('selected');
	});

	// Equalize calendar columns' height
	function equalize_height() {
		var max_h = $('.calendar-right').height();
		$('.calendar-left').css('height', max_h + 80);
	}

	if ($(this).width() >= 768)
		equalize_height();

	$(window).resize(function () {
		console.log($(this).width());
		if ($(this).width() >= 768)
			equalize_height();
		else
			$('.calendar-left').css('height', 'auto');
	});

});