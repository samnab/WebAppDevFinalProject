$(document).ready(function(){

  $("#calendar").fullCalendar({
    header:{
      left:   'title',
      center: '',
      right:  'today prev,next'
    },
    theme: false
  });

  // $("#datepicker").on("click", function(){
  //   $('#datepicker').datepicker({
  //   });
  // });
  //
  // var date = $('datepicker').datepicker("getDate");
  // console.log(""+date);

});
