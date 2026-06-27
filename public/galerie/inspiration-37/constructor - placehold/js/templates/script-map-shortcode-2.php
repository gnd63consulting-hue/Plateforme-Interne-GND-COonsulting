jQuery(document).ready(function(){ jQuery("#map15864381951110341550").simplegmaps({ MapOptions: { mapTypeId: google.maps.MapTypeId.ROADMAP,zoom: 15,styles: [{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#444444"}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"on"}]}], } }); });
jQuery(document).ready(function(){ 
	var mapHeight = jQuery("#map15864381951110341550").parent().parent().height();
	if(mapHeight>0)
	{
		jQuery("#map15864381951110341550").css('height', mapHeight+'px');
	}
});
